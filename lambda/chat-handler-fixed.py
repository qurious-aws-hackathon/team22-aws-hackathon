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
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
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
                'lastRecommendations': [],
                'questionsAsked': []
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
        print(f"Current preferences: {session['context'].get('extractedPreferences', {})}")
        
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
        ai_response = process_conversation_improved(message, session['context'])
        
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
        
        # Update preferences and stage
        if 'extractedPreferences' in ai_response:
            updated_context['extractedPreferences'].update(ai_response['extractedPreferences'])
        
        updated_context['conversationStage'] = ai_response.get('conversationStage', 'preference_gathering')
        
        if 'questionsAsked' in ai_response:
            updated_context['questionsAsked'] = ai_response['questionsAsked']
        
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
            
            # Update last recommendations
            updated_context['lastRecommendations'] = [r['spotId'] for r in recommendations]
            sessions_table.update_item(
                Key={'sessionId': session_id},
                UpdateExpression='SET #ctx = :ctx',
                ExpressionAttributeNames={'#ctx': 'context'},
                ExpressionAttributeValues={':ctx': updated_context}
            )
        
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

def process_conversation_improved(message, context):
    """Improved conversation processing with better flow control"""
    
    current_preferences = context.get('extractedPreferences', {})
    conversation_stage = context.get('conversationStage', 'initial')
    questions_asked = context.get('questionsAsked', [])
    
    print(f"Current stage: {conversation_stage}")
    print(f"Questions asked: {questions_asked}")
    
    # Extract preferences from message
    message_lower = message.lower()
    new_preferences = extract_preferences_from_message(message_lower)
    
    # Merge with existing preferences
    merged_preferences = current_preferences.copy()
    merged_preferences.update(new_preferences)
    
    print(f"Extracted preferences: {new_preferences}")
    print(f"Merged preferences: {merged_preferences}")
    
    # Check what information we still need
    required_info = ['category', 'location', 'purpose']
    missing_info = [info for info in required_info if not merged_preferences.get(info)]
    
    print(f"Missing info: {missing_info}")
    
    # If we have all required info, provide recommendations
    if not missing_info:
        return {
            'text': f"완벽합니다! {merged_preferences.get('location', '서울')} 지역의 {merged_preferences.get('category', '조용한')} 장소를 {merged_preferences.get('purpose', '이용')}용으로 추천해드릴게요.",
            'extractedPreferences': merged_preferences,
            'conversationStage': 'recommendations_ready',
            'readyForRecommendations': True,
            'type': 'recommendation',
            'questionsAsked': questions_asked
        }
    
    # Ask for missing information, but don't repeat questions
    for info in missing_info:
        if info not in questions_asked:
            question_data = get_question_for_info(info)
            new_questions_asked = questions_asked + [info]
            
            return {
                'text': question_data['text'],
                'extractedPreferences': merged_preferences,
                'conversationStage': f'{info}_gathering',
                'readyForRecommendations': False,
                'type': 'clarification',
                'suggestions': question_data['suggestions'],
                'questionsAsked': new_questions_asked
            }
    
    # If all questions were asked but still missing info, try to proceed with what we have
    return {
        'text': f"알겠습니다! 현재 정보로 {merged_preferences.get('category', '조용한')} 장소를 추천해드릴게요.",
        'extractedPreferences': merged_preferences,
        'conversationStage': 'recommendations_ready',
        'readyForRecommendations': True,
        'type': 'recommendation',
        'questionsAsked': questions_asked
    }

def extract_preferences_from_message(message_lower):
    """Extract preferences from user message"""
    preferences = {}
    
    # Location detection
    locations = ['강남', '홍대', '이태원', '명동', '신촌', '건대', '신림', '잠실']
    for loc in locations:
        if loc in message_lower:
            preferences['location'] = loc
            break
    
    # Category detection
    if any(cat in message_lower for cat in ['카페', '커피', 'coffee']):
        preferences['category'] = '카페'
    elif any(cat in message_lower for cat in ['도서관', '라이브러리']):
        preferences['category'] = '도서관'
    elif any(cat in message_lower for cat in ['공원', '파크']):
        preferences['category'] = '공원'
    
    # Purpose detection
    if any(purpose in message_lower for purpose in ['작업', '업무', '일', 'work']):
        preferences['purpose'] = 'work'
    elif any(purpose in message_lower for purpose in ['공부', '학습', 'study']):
        preferences['purpose'] = 'study'
    elif any(purpose in message_lower for purpose in ['휴식', '쉬', 'rest']):
        preferences['purpose'] = 'rest'
    elif any(purpose in message_lower for purpose in ['데이트', '만남']):
        preferences['purpose'] = 'date'
    
    # Atmosphere detection
    if any(atm in message_lower for atm in ['조용', '조용한', 'quiet']):
        preferences['atmosphere'] = ['quiet']
    
    return preferences

def get_question_for_info(info_type):
    """Get appropriate question for missing information"""
    questions = {
        'category': {
            'text': '어떤 종류의 장소를 찾고 계신가요?',
            'suggestions': ['카페', '도서관', '공원']
        },
        'location': {
            'text': '어느 지역을 선호하시나요?',
            'suggestions': ['강남', '홍대', '이태원', '명동']
        },
        'purpose': {
            'text': '어떤 목적으로 이용하실 건가요?',
            'suggestions': ['작업', '공부', '휴식', '데이트']
        }
    }
    return questions.get(info_type, {'text': '추가 정보를 알려주세요.', 'suggestions': []})

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
                'description': spot.get('description', ''),
                'noiseLevel': int(spot.get('noise_level', 40))
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
    
    noise_level = int(spot.get('noise_level', 40))
    if noise_level <= 35:
        reasons.append(f"매우 낮은 소음 레벨 ({noise_level}dB)")
    
    return reasons[:3]

def success_response(data):
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
        },
        'body': json.dumps(data, ensure_ascii=False)
    }

def error_response(status_code, message):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token'
        },
        'body': json.dumps({'error': message}, ensure_ascii=False)
    }
