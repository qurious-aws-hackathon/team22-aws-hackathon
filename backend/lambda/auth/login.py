import json
import boto3
import hashlib
import jwt
import os
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table('Users')

# JWT 시크릿 키 (실제 환경에서는 환경변수 사용)
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here')

def lambda_handler(event, context):
    try:
        # CORS 헤더
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        }
        
        # OPTIONS 요청 처리
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': ''
            }
        
        # POST 요청만 허용
        if event['httpMethod'] != 'POST':
            return {
                'statusCode': 405,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': 'Method not allowed'})
            }
        
        # 요청 본문 파싱
        body = json.loads(event['body'])
        username = body.get('nickname', '').strip()
        password = body.get('password', '').strip()
        
        # 입력 검증
        if not username or not password:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': '아이디와 비밀번호를 입력해주세요.'})
            }
        
        # 사용자 조회
        try:
            response = users_table.scan(
                FilterExpression='nickname = :username',
                ExpressionAttributeValues={':username': username}
            )
            
            if not response['Items']:
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'success': False, 'message': '아이디 또는 비밀번호가 잘못되었습니다.'})
                }
            
            user = response['Items'][0]
            
        except Exception as e:
            print(f"사용자 조회 오류: {str(e)}")
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': '서버 오류가 발생했습니다.'})
            }
        
        # 비밀번호 검증
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        if user['password'] != password_hash:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': '아이디 또는 비밀번호가 잘못되었습니다.'})
            }
        
        # JWT 토큰 생성
        payload = {
            'user_id': user['id'],
            'username': user['nickname'],
            'exp': datetime.utcnow() + timedelta(days=7)  # 7일 만료
        }
        
        token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
        
        # 응답 (비밀번호 제외)
        user_response = {
            'id': user['id'],
            'nickname': user['nickname'],
            'created_at': user['created_at'],
            'updated_at': user['updated_at']
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': '로그인 성공',
                'user': user_response,
                'token': token
            })
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': '잘못된 요청 형식입니다.'})
        }
    except Exception as e:
        print(f"로그인 오류: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': '서버 오류가 발생했습니다.'})
        }