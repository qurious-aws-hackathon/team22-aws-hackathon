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
                'questionsAsked': [],
                'recommendationCount': 0
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
        print(f"Current stage: {session['context'].get('conversationStage', 'initial')}")
        
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
        ai_response = process_conversation_with_completion(message, session['context'])
        
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
        
        if 'recommendationCount' in ai_response:
            updated_context['recommendationCount'] = ai_response['recommendationCount']
        
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
            recommendations = get_spot_recommendations_with_fallback(updated_context['extractedPreferences'])
            print(f"Generated {len(recommendations)} recommendations")
            
            # Update last recommendations and count
            updated_context['lastRecommendations'] = [r.get('spotId', f'bedrock-{i}') for i, r in enumerate(recommendations)]
            updated_context['recommendationCount'] = updated_context.get('recommendationCount', 0) + 1
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

def get_spot_recommendations_with_fallback(preferences):
    """Get recommendations from DB, fallback to Bedrock if empty"""
    try:
        # Try to get recommendations from database first
        db_recommendations = get_spot_recommendations(preferences)
        
        if db_recommendations and len(db_recommendations) > 0:
            print(f"Found {len(db_recommendations)} DB recommendations")
            return db_recommendations
        
        # If no DB recommendations, use Bedrock fallback
        print("No DB recommendations found, using Bedrock fallback")
        return get_bedrock_recommendations(preferences)
        
    except Exception as e:
        print(f"Recommendation error: {str(e)}")
        # Even if everything fails, try Bedrock as last resort
        try:
            return get_bedrock_recommendations(preferences)
        except:
            return []

def get_bedrock_recommendations(preferences):
    """Generate recommendations using Bedrock when DB is empty"""
    try:
        category = preferences.get('category', '조용한 장소')
        location = preferences.get('location', '서울')
        purpose = preferences.get('purpose', '이용')
        
        prompt = f"""서울 {location} 지역의 조용한 {category} 추천 5곳을 JSON 배열로 제공해주세요.
각 장소는 다음 형식으로:
{{
  "name": "장소명",
  "description": "간단한 설명",
  "category": "{category}",
  "rating": 4.0-5.0,
  "quietRating": 80-95,
  "noiseLevel": 25-40,
  "matchReasons": ["추천 이유1", "추천 이유2"],
  "location": {{"lat": 37.5, "lng": 126.9}}
}}

실제 존재하는 장소들로 추천해주세요."""

        response = bedrock.invoke_model(
            modelId=BEDROCK_MODEL_ID,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1500,
                "messages": [{"role": "user", "content": prompt}]
            })
        )
        
        response_body = json.loads(response['body'].read())
        ai_text = response_body['content'][0]['text']
        
        # Try to parse JSON from AI response
        try:
            # Extract JSON from response
            start_idx = ai_text.find('[')
            end_idx = ai_text.rfind(']') + 1
            if start_idx != -1 and end_idx != -1:
                json_str = ai_text[start_idx:end_idx]
                bedrock_spots = json.loads(json_str)
                
                # Convert to our format
                recommendations = []
                for i, spot in enumerate(bedrock_spots[:5]):
                    recommendations.append({
                        'spotId': f'bedrock-{i+1}',
                        'name': spot.get('name', f'추천 {category} {i+1}'),
                        'score': 0.9,  # High score for Bedrock recommendations
                        'matchReasons': spot.get('matchReasons', [f'{category} 추천', 'AI 추천']),
                        'location': spot.get('location', {'lat': 37.5665, 'lng': 126.9780}),
                        'category': spot.get('category', category),
                        'rating': float(spot.get('rating', 4.2)),
                        'quietRating': int(spot.get('quietRating', 85)),
                        'description': spot.get('description', '조용하고 좋은 장소입니다.'),
                        'noiseLevel': int(spot.get('noiseLevel', 30)),
                        'imageUrl': None,  # Bedrock recommendations don't have images
                        'source': 'bedrock'
                    })
                
                print(f"Generated {len(recommendations)} Bedrock recommendations")
                return recommendations
                
        except json.JSONDecodeError:
            print("Failed to parse Bedrock JSON response")
        
        # Fallback: create basic recommendations
        return create_fallback_recommendations(preferences)
        
    except Exception as e:
        print(f"Bedrock recommendation error: {str(e)}")
        return create_fallback_recommendations(preferences)

def create_fallback_recommendations(preferences):
    """Create basic fallback recommendations when everything else fails"""
    category = preferences.get('category', '조용한 장소')
    location = preferences.get('location', '서울')
    
    fallback_spots = [
        {'name': f'{location} 조용한 카페', 'desc': '조용하고 아늑한 분위기의 카페'},
        {'name': f'{location} 도서관', 'desc': '공부하기 좋은 조용한 환경'},
        {'name': f'{location} 공원', 'desc': '자연 속에서 휴식할 수 있는 곳'}
    ]
    
    recommendations = []
    for i, spot in enumerate(fallback_spots):
        recommendations.append({
            'spotId': f'fallback-{i+1}',
            'name': spot['name'],
            'score': 0.8,
            'matchReasons': [f'{category} 추천', '기본 추천'],
            'location': {'lat': 37.5665, 'lng': 126.9780},
            'category': category,
            'rating': 4.0,
            'quietRating': 80,
            'description': spot['desc'],
            'noiseLevel': 35,
            'imageUrl': None,  # Fallback recommendations don't have images
            'source': 'fallback'
        })
    
    return recommendations

def process_conversation_with_completion(message, context):
    """Enhanced conversation processing with completion handling"""
    
    current_preferences = context.get('extractedPreferences', {})
    conversation_stage = context.get('conversationStage', 'initial')
    questions_asked = context.get('questionsAsked', [])
    recommendation_count = context.get('recommendationCount', 0)
    
    print(f"Current stage: {conversation_stage}")
    print(f"Recommendation count: {recommendation_count}")
    
    message_lower = message.lower()
    
    # Handle post-recommendation responses
    if conversation_stage == 'completed' or recommendation_count > 0:
        return handle_post_recommendation_response(message_lower, context)
    
    # Extract preferences from message
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
            'conversationStage': 'recommendations_provided',
            'readyForRecommendations': True,
            'type': 'recommendation',
            'questionsAsked': questions_asked,
            'recommendationCount': recommendation_count + 1
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
        'conversationStage': 'recommendations_provided',
        'readyForRecommendations': True,
        'type': 'recommendation',
        'questionsAsked': questions_asked,
        'recommendationCount': recommendation_count + 1
    }

def handle_post_recommendation_response(message_lower, context):
    """Handle user responses after recommendations are provided"""
    
    # Check for new search request
    if any(keyword in message_lower for keyword in ['새로', '다른', '다시', '또', '새', 'new', 'another']):
        return {
            'text': '새로운 장소를 찾아드릴게요! 어떤 종류의 장소를 찾고 계신가요?',
            'extractedPreferences': {},
            'conversationStage': 'initial',
            'readyForRecommendations': False,
            'type': 'clarification',
            'suggestions': ['카페', '도서관', '공원'],
            'questionsAsked': [],
            'recommendationCount': 0
        }
    
    # Check for thank you or completion
    if any(keyword in message_lower for keyword in ['감사', '고마워', '좋아', '괜찮', '충분', '끝', '종료', 'thanks', 'thank']):
        return {
            'text': '도움이 되었다니 기쁩니다! 언제든지 새로운 조용한 장소가 필요하시면 "새로운 장소 찾아줘"라고 말씀해 주세요. 😊',
            'extractedPreferences': context.get('extractedPreferences', {}),
            'conversationStage': 'completed',
            'readyForRecommendations': False,
            'type': 'completion',
            'suggestions': ['새로운 장소 찾아줘', '대화 종료'],
            'questionsAsked': context.get('questionsAsked', []),
            'recommendationCount': context.get('recommendationCount', 0)
        }
    
    # Check for more information request
    if any(keyword in message_lower for keyword in ['더', '자세히', '정보', '어디', 'more', 'detail']):
        return {
            'text': '추천해드린 장소들은 조용함 점수가 높고 검증된 곳들입니다. 지도에서 위치를 확인하시거나, 새로운 조건으로 다른 장소를 찾아보실 수 있어요!',
            'extractedPreferences': context.get('extractedPreferences', {}),
            'conversationStage': 'recommendations_provided',
            'readyForRecommendations': False,
            'type': 'information',
            'suggestions': ['새로운 장소 찾아줘', '감사합니다'],
            'questionsAsked': context.get('questionsAsked', []),
            'recommendationCount': context.get('recommendationCount', 0)
        }
    
    # Default response for unclear post-recommendation messages
    return {
        'text': '추천해드린 장소들이 마음에 드시나요? 새로운 조건으로 다른 장소를 찾아보시거나, 추가 질문이 있으시면 언제든 말씀해 주세요!',
        'extractedPreferences': context.get('extractedPreferences', {}),
        'conversationStage': 'recommendations_provided',
        'readyForRecommendations': False,
        'type': 'followup',
        'suggestions': ['새로운 장소 찾아줘', '감사합니다', '더 자세한 정보'],
        'questionsAsked': context.get('questionsAsked', []),
        'recommendationCount': context.get('recommendationCount', 0)
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
                'noiseLevel': int(spot.get('noise_level', 40)),
                'imageUrl': spot.get('image_url'),  # Include nullable image URL
                'source': 'database'
            })
        
        return sorted(recommendations, key=lambda x: x['score'], reverse=True)
    except Exception as e:
        print(f"Database recommendation error: {str(e)}")
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
