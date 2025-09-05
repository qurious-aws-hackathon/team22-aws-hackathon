import json
import boto3
import uuid
from datetime import datetime, timedelta
import os
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime')

SESSIONS_TABLE = os.environ.get('SESSIONS_TABLE', 'ChatSessions')
MESSAGES_TABLE = os.environ.get('MESSAGES_TABLE', 'ChatMessages')
SPOTS_TABLE = os.environ.get('SPOTS_TABLE', 'Spots')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-haiku-20240307-v1:0')

def lambda_handler(event, context):
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        if http_method == 'POST' and path.endswith('/sessions'):
            return create_session(event)
        elif http_method == 'POST' and '/messages' in path:
            return send_message(event)
        elif http_method == 'GET' and '/recommendations' in path:
            return get_recommendations(event)
        else:
            return error_response(404, 'Endpoint not found')
    except Exception as e:
        return error_response(500, str(e))

def create_session(event):
    try:
        body = json.loads(event.get('body', '{}'))
        user_id = body.get('userId', f'anonymous-{uuid.uuid4()}')
        metadata = body.get('metadata', {})
        
        session_id = f"sess-{uuid.uuid4()}"
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=24)
        
        sessions_table = dynamodb.Table(SESSIONS_TABLE)
        
        session_data = {
            'sessionId': session_id,
            'userId': user_id,
            'status': 'active',
            'createdAt': int(now.timestamp()),
            'updatedAt': int(now.timestamp()),
            'expiresAt': int(expires_at.timestamp()),
            'context': {
                'conversationHistory': [],
                'extractedPreferences': {},
                'conversationStage': 'initial',
                'lastRecommendations': []
            },
            'metadata': metadata
        }
        
        sessions_table.put_item(Item=session_data)
        
        return success_response({
            'sessionId': session_id,
            'expiresAt': expires_at.isoformat() + 'Z',
            'status': 'active'
        })
    except Exception as e:
        return error_response(500, f'Failed to create session: {str(e)}')

def send_message(event):
    try:
        session_id = event.get('pathParameters', {}).get('sessionId')
        if not session_id:
            return error_response(400, 'Session ID required')
            
        body = json.loads(event.get('body', '{}'))
        message = body.get('message', '').strip()
        if not message:
            return error_response(400, 'Message content required')
        
        sessions_table = dynamodb.Table(SESSIONS_TABLE)
        messages_table = dynamodb.Table(MESSAGES_TABLE)
        
        # Get session (read-only, no side effects)
        session_response = sessions_table.get_item(Key={'sessionId': session_id})
        if 'Item' not in session_response:
            return error_response(404, 'Session not found')
        
        session = session_response['Item']
        
        # Save user message
        timestamp = int(datetime.utcnow().timestamp() * 1000)
        message_id = f"msg-{uuid.uuid4()}"
        
        messages_table.put_item(Item={
            'sessionId': session_id,
            'timestamp': timestamp,
            'messageId': message_id,
            'role': 'user',
            'content': message,
            'messageType': 'text'
        })
        
        # Process with AI
        ai_response = process_with_bedrock(message, session['context'])
        
        # Save AI response
        ai_timestamp = timestamp + 1
        ai_message_id = f"msg-{uuid.uuid4()}"
        
        messages_table.put_item(Item={
            'sessionId': session_id,
            'timestamp': ai_timestamp,
            'messageId': ai_message_id,
            'role': 'assistant',
            'content': ai_response['text'],
            'messageType': 'response'
        })
        
        # Update session context (isolated update)
        updated_context = session['context'].copy()
        updated_context['conversationHistory'].append({
            'role': 'user',
            'content': message,
            'timestamp': datetime.utcfromtimestamp(timestamp/1000).isoformat() + 'Z'
        })
        updated_context['conversationHistory'].append({
            'role': 'assistant',
            'content': ai_response['text'],
            'timestamp': datetime.utcfromtimestamp(ai_timestamp/1000).isoformat() + 'Z'
        })
        
        if 'extractedPreferences' in ai_response:
            updated_context['extractedPreferences'].update(ai_response['extractedPreferences'])
        
        updated_context['conversationStage'] = ai_response.get('conversationStage', 'preference_gathering')
        
        # Update session
        sessions_table.update_item(
            Key={'sessionId': session_id},
            UpdateExpression='SET #ctx = :ctx, updatedAt = :updated',
            ExpressionAttributeNames={'#ctx': 'context'},
            ExpressionAttributeValues={
                ':ctx': updated_context,
                ':updated': int(datetime.utcnow().timestamp())
            }
        )
        
        # Get recommendations if ready
        recommendations = None
        if ai_response.get('readyForRecommendations', False):
            recommendations = get_spot_recommendations(updated_context['extractedPreferences'])
        
        return success_response({
            'messageId': ai_message_id,
            'response': {
                'text': ai_response['text'],
                'type': ai_response.get('type', 'response'),
                'suggestions': ai_response.get('suggestions', [])
            },
            'context': {
                'extractedPreferences': updated_context['extractedPreferences'],
                'conversationStage': updated_context['conversationStage']
            },
            'recommendations': recommendations
        })
    except Exception as e:
        return error_response(500, f'Failed to process message: {str(e)}')

def process_with_bedrock(message, context):
    system_prompt = """당신은 조용한 장소 추천 전문가입니다. 사용자 요청을 분석하여 JSON으로 응답하세요:

{
  "text": "사용자 응답 텍스트",
  "extractedPreferences": {
    "atmosphere": ["quiet"],
    "category": "카페|도서관|공원|기타",
    "purpose": "work|study|rest",
    "location": "지역명"
  },
  "conversationStage": "preference_gathering|ready_for_recommendations",
  "readyForRecommendations": false,
  "type": "clarification|response",
  "suggestions": ["옵션1", "옵션2"]
}"""

    try:
        conversation_history = context.get('conversationHistory', [])[-4:]  # Last 4 messages
        current_preferences = context.get('extractedPreferences', {})
        
        user_prompt = f"""
대화 히스토리: {json.dumps(conversation_history, ensure_ascii=False)}
현재 선호도: {json.dumps(current_preferences, ensure_ascii=False)}
사용자 메시지: {message}
"""

        response = bedrock.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 800,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}]
            })
        )
        
        response_body = json.loads(response['body'].read())
        ai_text = response_body['content'][0]['text']
        
        try:
            return json.loads(ai_text)
        except:
            return {
                "text": ai_text,
                "conversationStage": "preference_gathering",
                "readyForRecommendations": False,
                "type": "response"
            }
    except Exception as e:
        return {
            "text": "죄송합니다. 일시적인 오류가 발생했습니다.",
            "conversationStage": "error",
            "readyForRecommendations": False,
            "type": "error"
        }

def get_spot_recommendations(preferences):
    try:
        spots_table = dynamodb.Table(SPOTS_TABLE)
        
        # Safe scan with filters (read-only, no side effects)
        scan_params = {
            'FilterExpression': boto3.dynamodb.conditions.Attr('quiet_rating').gte(70),
            'Limit': 20
        }
        
        category = preferences.get('category')
        if category and category in ['카페', '도서관', '공원', '기타']:
            scan_params['FilterExpression'] = scan_params['FilterExpression'] & \
                boto3.dynamodb.conditions.Attr('category').eq(category)
        
        response = spots_table.scan(**scan_params)
        spots = response.get('Items', [])
        
        recommendations = []
        for spot in spots[:5]:
            score = calculate_score(spot, preferences)
            recommendations.append({
                'spotId': spot['id'],
                'name': spot['name'],
                'score': float(score),
                'matchReasons': generate_match_reasons(spot, preferences),
                'location': {
                    'lat': float(spot['lat']),
                    'lng': float(spot['lng'])
                },
                'category': spot['category'],
                'rating': float(spot['rating']),
                'quietRating': int(spot['quiet_rating'])
            })
        
        return sorted(recommendations, key=lambda x: x['score'], reverse=True)
    except Exception as e:
        return []

def calculate_score(spot, preferences):
    score = 0.5
    
    quiet_rating = int(spot.get('quiet_rating', 70))
    if quiet_rating >= 90:
        score += 0.3
    elif quiet_rating >= 80:
        score += 0.2
    
    if preferences.get('category') == spot.get('category'):
        score += 0.2
    
    rating = float(spot.get('rating', 3.0))
    if rating >= 4.0:
        score += 0.1
    
    return min(score, 1.0)

def generate_match_reasons(spot, preferences):
    reasons = []
    
    quiet_rating = int(spot.get('quiet_rating', 70))
    if quiet_rating >= 85:
        reasons.append(f"매우 조용한 환경 (조용함 점수: {quiet_rating}점)")
    
    rating = float(spot.get('rating', 3.0))
    if rating >= 4.0:
        reasons.append(f"높은 평점 ({rating}점)")
    
    if preferences.get('category') == spot.get('category'):
        reasons.append(f"{spot['category']} 카테고리 일치")
    
    return reasons[:3]

def get_recommendations(event):
    try:
        session_id = event.get('pathParameters', {}).get('sessionId')
        if not session_id:
            return error_response(400, 'Session ID required')
        
        sessions_table = dynamodb.Table(SESSIONS_TABLE)
        session_response = sessions_table.get_item(Key={'sessionId': session_id})
        
        if 'Item' not in session_response:
            return error_response(404, 'Session not found')
        
        session = session_response['Item']
        preferences = session['context']['extractedPreferences']
        recommendations = get_spot_recommendations(preferences)
        
        return success_response({
            'recommendations': recommendations,
            'totalCount': len(recommendations),
            'searchCriteria': preferences
        })
    except Exception as e:
        return error_response(500, f'Failed to get recommendations: {str(e)}')

def success_response(data):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps(data, ensure_ascii=False)
    }

def error_response(status_code, message):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': message}, ensure_ascii=False)
    }
