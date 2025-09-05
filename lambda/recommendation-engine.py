import json
import boto3
import math
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime')

def lambda_handler(event, context):
    try:
        preferences = event.get('preferences', {})
        user_location = event.get('userLocation')
        limit = event.get('limit', 5)
        
        spots = get_filtered_spots(preferences)
        recommendations = generate_recommendations(spots, preferences, user_location, limit)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'recommendations': recommendations,
                'totalCount': len(recommendations)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def get_filtered_spots(preferences):
    spots_table = dynamodb.Table('Spots')
    
    # Base filter for quiet places
    filter_expression = boto3.dynamodb.conditions.Attr('quiet_rating').gte(70)
    
    # Category filter
    if preferences.get('category'):
        filter_expression = filter_expression & boto3.dynamodb.conditions.Attr('category').eq(preferences['category'])
    
    # Noise level filter
    if preferences.get('atmosphere') and 'quiet' in preferences['atmosphere']:
        filter_expression = filter_expression & boto3.dynamodb.conditions.Attr('noise_level').lte(45)
    
    response = spots_table.scan(FilterExpression=filter_expression)
    return response['Items']

def generate_recommendations(spots, preferences, user_location, limit):
    recommendations = []
    
    for spot in spots:
        score = calculate_advanced_score(spot, preferences, user_location)
        match_reasons = generate_detailed_match_reasons(spot, preferences)
        
        recommendation = {
            'spotId': spot['id'],
            'name': spot['name'],
            'score': float(score),
            'matchReasons': match_reasons,
            'location': {
                'lat': float(spot['lat']),
                'lng': float(spot['lng']),
                'address': f"서울시 {spot.get('district', '지역')}",
                'distance': calculate_distance(spot, user_location) if user_location else None
            },
            'attributes': {
                'category': spot['category'],
                'rating': float(spot['rating']),
                'quietRating': spot['quiet_rating'],
                'noiseLevel': spot['noise_level']
            }
        }
        
        recommendations.append(recommendation)
    
    # Sort by score and return top results
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    return recommendations[:limit]

def calculate_advanced_score(spot, preferences, user_location):
    score = 0.0
    
    # Base quiet rating score (40% weight)
    quiet_score = spot['quiet_rating'] / 100.0
    score += quiet_score * 0.4
    
    # Overall rating score (20% weight)
    rating_score = float(spot['rating']) / 5.0
    score += rating_score * 0.2
    
    # Category match (20% weight)
    if preferences.get('category') == spot['category']:
        score += 0.2
    
    # Atmosphere match (10% weight)
    atmosphere_prefs = preferences.get('atmosphere', [])
    if 'quiet' in atmosphere_prefs and spot['quiet_rating'] >= 85:
        score += 0.1
    
    # Distance bonus (10% weight)
    if user_location:
        distance = calculate_distance(spot, user_location)
        if distance and distance <= 1.0:  # Within 1km
            score += 0.1 * (1.0 - distance)
    
    return min(score, 1.0)

def calculate_distance(spot, user_location):
    if not user_location or 'lat' not in user_location or 'lng' not in user_location:
        return None
    
    lat1, lng1 = float(spot['lat']), float(spot['lng'])
    lat2, lng2 = user_location['lat'], user_location['lng']
    
    # Haversine formula
    R = 6371  # Earth's radius in km
    
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    
    a = (math.sin(dlat/2) * math.sin(dlat/2) + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlng/2) * math.sin(dlng/2))
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = R * c
    
    return round(distance, 2)

def generate_detailed_match_reasons(spot, preferences):
    reasons = []
    
    # Quiet rating reasons
    quiet_rating = spot['quiet_rating']
    if quiet_rating >= 90:
        reasons.append(f"매우 조용한 환경 (조용함 점수: {quiet_rating}점)")
    elif quiet_rating >= 80:
        reasons.append(f"조용한 분위기 (조용함 점수: {quiet_rating}점)")
    
    # Noise level reasons
    noise_level = spot['noise_level']
    if noise_level <= 35:
        reasons.append(f"매우 낮은 소음 레벨 ({noise_level}dB)")
    elif noise_level <= 45:
        reasons.append(f"낮은 소음 레벨 ({noise_level}dB)")
    
    # Rating reasons
    rating = float(spot['rating'])
    if rating >= 4.5:
        reasons.append(f"우수한 평점 ({rating}점)")
    elif rating >= 4.0:
        reasons.append(f"높은 평점 ({rating}점)")
    
    # Category match
    if preferences.get('category') == spot['category']:
        category_names = {
            '카페': '카페',
            '도서관': '도서관', 
            '공원': '공원',
            '기타': '기타 시설'
        }
        reasons.append(f"{category_names.get(spot['category'], spot['category'])} 카테고리 일치")
    
    # Purpose-based reasons
    purpose = preferences.get('purpose')
    if purpose == 'work' and spot['category'] in ['카페', '도서관']:
        reasons.append("작업하기 좋은 환경")
    elif purpose == 'study' and spot['category'] == '도서관':
        reasons.append("공부하기 최적의 장소")
    
    return reasons[:3]  # Return top 3 reasons
