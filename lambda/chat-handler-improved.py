import json
import boto3
import uuid
from datetime import datetime, timedelta
import os

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
        
        print(f"Request: {http_method} {path}")
        
        if http_method == 'POST' and path == '/chat/sessions':
            return create_session(event)
        elif http_method == 'POST' and '/messages' in path:
            return send_message(event)
        else:
            return error_response(404, 'Endpoint not found')
    except Exception as e:
        print(f"Error: {str(e)}")
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
        print(f"Session created: {session_id}")
        
        return success_response({
            'sessionId': session_id,
            'expiresAt': expires_at.isoformat() + 'Z',
            'status': 'active'
        })
    except Exception as e:
        print(f"Create session error: {str(e)}")
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
        
        # Get session
        session_response = sessions_table.get_item(Key={'sessionId': session_id})
        if 'Item' not in session_response:
            return error_response(404, 'Session not found')
        
        session = session_response['Item']
        print(f"Processing message for session: {session_id}")
        
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
        
        # Process with improved logic
        ai_response = process_conversation(message, session['context'])
        
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
        
        # Update session context
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
            print(f"Generated {len(recommendations)} recommendations")
        
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
        print(f"Send message error: {str(e)}")
        return error_response(500, f'Failed to process message: {str(e)}')

def process_conversation(message, context):
    """Improved conversation processing with step-by-step flow"""
    
    current_preferences = context.get('extractedPreferences', {})
    conversation_stage = context.get('conversationStage', 'initial')
    
    # Simple rule-based conversation flow
    message_lower = message.lower()
    
    # Extract preferences from message
    new_preferences = {}
    
    # Location detection
    if any(loc in message_lower for loc in ['강남', '홍대', '이태원', '명동', '신촌']):
        for loc in ['강남', '홍대', '이태원', '명동', '신촌']:
            if loc in message_lower:
                new_preferences['location'] = loc
                break
    
    # Category detection
    if any(cat in message_lower for cat in ['카페', '도서관', '공원']):
        for cat in ['카페', '도서관', '공원']:
            if cat in message_lower:
                new_preferences['category'] = cat
                break
    
    # Purpose detection
    if any(purpose in message_lower for purpose in ['작업', '공부', '휴식', '데이트']):
        if '작업' in message_lower:
            new_preferences['purpose'] = 'work'
        elif '공부' in message_lower:
            new_preferences['purpose'] = 'study'
        elif '휴식' in message_lower:
            new_preferences['purpose'] = 'rest'
        elif '데이트' in message_lower:
            new_preferences['purpose'] = 'date'
    
    # Atmosphere detection
    if '조용' in message_lower:
        new_preferences['atmosphere'] = ['quiet']
    
    # Update preferences
    current_preferences.update(new_preferences)
    
    # Determine next step based on what we have
    missing_info = []
    if not current_preferences.get('category'):
        missing_info.append('category')
    if not current_preferences.get('location'):
        missing_info.append('location')
    if not current_preferences.get('purpose'):
        missing_info.append('purpose')
    
    # Generate response based on conversation flow
    if conversation_stage == 'initial' or not current_preferences:
        return {
            'text': '안녕하세요! 조용한 장소 추천 서비스입니다. 어떤 종류의 장소를 찾고 계신가요?',
            'extractedPreferences': current_preferences,
            'conversationStage': 'category_gathering',
            'readyForRecommendations': False,
            'type': 'clarification',
            'suggestions': ['카페', '도서관', '공원']
        }
    
    elif 'category' in missing_info:
        return {
            'text': '어떤 종류의 장소를 원하시나요?',
            'extractedPreferences': current_preferences,
            'conversationStage': 'category_gathering',
            'readyForRecommendations': False,
            'type': 'clarification',
            'suggestions': ['카페', '도서관', '공원']
        }
    
    elif 'location' in missing_info:
        return {
            'text': '어느 지역을 선호하시나요?',
            'extractedPreferences': current_preferences,
            'conversationStage': 'location_gathering',
            'readyForRecommendations': False,
            'type': 'clarification',
            'suggestions': ['강남', '홍대', '이태원']
        }
    
    elif 'purpose' in missing_info:
        return {
            'text': '어떤 목적으로 이용하실 건가요?',
            'extractedPreferences': current_preferences,
            'conversationStage': 'purpose_gathering',
            'readyForRecommendations': False,
            'type': 'clarification',
            'suggestions': ['작업', '공부', '휴식']
        }
    
    else:
        # We have enough information, provide recommendations
        return {
            'text': f"좋습니다! {current_preferences.get('location', '서울')} 지역의 {current_preferences.get('category', '조용한')} 장소를 추천해드릴게요.",
            'extractedPreferences': current_preferences,
            'conversationStage': 'recommendations_ready',
            'readyForRecommendations': True,
            'type': 'recommendation'
        }

def get_spot_recommendations(preferences):
    try:
        spots_table = dynamodb.Table(SPOTS_TABLE)
        
        # Build filter based on preferences
        filter_expression = boto3.dynamodb.conditions.Attr('quiet_rating').gte(70)
        
        category = preferences.get('category')
        if category:
            filter_expression = filter_expression & boto3.dynamodb.conditions.Attr('category').eq(category)
        
        response = spots_table.scan(
            FilterExpression=filter_expression,
            Limit=10
        )
        
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
                'quietRating': int(spot['quiet_rating']),
                'description': spot.get('description', '')
            })
        
        return sorted(recommendations, key=lambda x: x['score'], reverse=True)
    except Exception as e:
        print(f"Recommendation error: {str(e)}")
        return []

def calculate_score(spot, preferences):
    score = 0.5
    
    quiet_rating = int(spot.get('quiet_rating', 70))
    if quiet_rating >= 90:
        score += 0.3
    elif quiet_rating >= 80:
        score += 0.2
    
    if preferences.get('category') == spot.get('category'):
        score += 0.3
    
    rating = float(spot.get('rating', 3.0))
    if rating >= 4.0:
        score += 0.2
    
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
