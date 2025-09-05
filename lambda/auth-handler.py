import json
import boto3
from boto3.dynamodb.conditions import Attr
import hashlib
import uuid
import re
from datetime import datetime
import os

dynamodb = boto3.resource('dynamodb')
USERS_TABLE = os.environ.get('USERS_TABLE', 'Users')

def lambda_handler(event, context):
    # CORS 헤더
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token',
        'Content-Type': 'application/json'
    }
    
    # OPTIONS 요청 처리
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        
        print(f"Auth Request: {http_method} {path}")
        
        if http_method == 'POST' and path == '/auth/register':
            return register_user(event, headers)
        elif http_method == 'POST' and path == '/auth/login':
            return login_user(event, headers)
        else:
            return error_response(404, 'Endpoint not found', headers)
            
    except Exception as e:
        print(f"Auth Error: {str(e)}")
        return error_response(500, str(e), headers)

def register_user(event, headers):
    try:
        body = json.loads(event.get('body', '{}'))
        nickname = body.get('nickname', '').strip()
        password = body.get('password', '').strip()
        
        # 입력 검증
        if not nickname or not password:
            return error_response(400, '아이디와 비밀번호를 입력해주세요.', headers)
        
        if not re.match(r'^[a-zA-Z0-9]{4,20}$', nickname):
            return error_response(400, '아이디는 영문+숫자 4-20자로 입력해주세요.', headers)
        
        if not re.match(r'^[a-zA-Z0-9!@#$%^&*]{6,20}$', password):
            return error_response(400, '비밀번호는 영문+숫자+특수문자 6-20자로 입력해주세요.', headers)
        
        users_table = dynamodb.Table(USERS_TABLE)
        
        # 중복 확인
        response = users_table.scan(
            FilterExpression=Attr('nickname').eq(nickname)
        )
        
        if response['Items']:
            return error_response(400, '이미 사용 중인 아이디입니다.', headers)
        
        # 비밀번호 해시화
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # 사용자 생성
        user_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + 'Z'
        
        user_data = {
            'id': user_id,
            'nickname': nickname,
            'password': password_hash,
            'created_at': now,
            'updated_at': now
        }
        
        users_table.put_item(Item=user_data)
        
        return success_response({
            'success': True,
            'message': '회원가입이 완료되었습니다.',
            'user': {
                'id': user_id,
                'nickname': nickname,
                'created_at': now,
                'updated_at': now
            }
        }, headers)
        
    except Exception as e:
        print(f"Register error: {str(e)}")
        return error_response(500, '서버 오류가 발생했습니다.', headers)

def login_user(event, headers):
    try:
        body = json.loads(event.get('body', '{}'))
        nickname = body.get('nickname', '').strip()
        password = body.get('password', '').strip()
        
        if not nickname or not password:
            return error_response(400, '아이디와 비밀번호를 입력해주세요.', headers)
        
        users_table = dynamodb.Table(USERS_TABLE)
        
        # 사용자 조회
        response = users_table.scan(
            FilterExpression=Attr('nickname').eq(nickname)
        )
        
        if not response['Items']:
            return error_response(401, '아이디 또는 비밀번호가 잘못되었습니다.', headers)
        
        user = response['Items'][0]
        
        # 비밀번호 검증
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        if user['password'] != password_hash:
            return error_response(401, '아이디 또는 비밀번호가 잘못되었습니다.', headers)
        
        return success_response({
            'success': True,
            'message': '로그인 성공',
            'user': {
                'id': user['id'],
                'nickname': user['nickname'],
                'created_at': user['created_at'],
                'updated_at': user['updated_at']
            },
            'token': 'temp-token'
        }, headers)
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return error_response(500, '서버 오류가 발생했습니다.', headers)

def success_response(data, headers):
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps(data, ensure_ascii=False)
    }

def error_response(status_code, message, headers):
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps({'error': message}, ensure_ascii=False)
    }