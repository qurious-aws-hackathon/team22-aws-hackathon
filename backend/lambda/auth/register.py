import json
import boto3
import hashlib
import uuid
from datetime import datetime
import re

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table('Users')

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
        
        # 아이디 형식 검증 (영문+숫자 4-20자)
        if not re.match(r'^[a-zA-Z0-9]{4,20}$', username):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': '아이디는 영문+숫자 4-20자로 입력해주세요.'})
            }
        
        # 비밀번호 형식 검증 (영문+숫자+특수문자 6-20자)
        if not re.match(r'^[a-zA-Z0-9!@#$%^&*]{6,20}$', password):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'success': False, 'message': '비밀번호는 영문+숫자+특수문자 6-20자로 입력해주세요.'})
            }
        
        # 중복 아이디 확인
        try:
            response = users_table.scan(
                FilterExpression='nickname = :username',
                ExpressionAttributeValues={':username': username}
            )
            
            if response['Items']:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'success': False, 'message': '이미 사용 중인 아이디입니다.'})
                }
        except Exception as e:
            print(f"중복 확인 오류: {str(e)}")
        
        # 비밀번호 해시화
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # 새 사용자 생성
        user_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + 'Z'
        
        user_data = {
            'id': user_id,
            'nickname': username,
            'password': password_hash,
            'created_at': now,
            'updated_at': now
        }
        
        # DynamoDB에 저장
        users_table.put_item(Item=user_data)
        
        # 응답 (비밀번호 제외)
        user_response = {
            'id': user_id,
            'nickname': username,
            'created_at': now,
            'updated_at': now
        }
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': '회원가입이 완료되었습니다.',
                'user': user_response
            })
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': '잘못된 요청 형식입니다.'})
        }
    except Exception as e:
        print(f"회원가입 오류: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'success': False, 'message': '서버 오류가 발생했습니다.'})
        }