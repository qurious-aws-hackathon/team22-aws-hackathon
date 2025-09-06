#!/bin/bash

# Auth Lambda 함수 배포 스크립트

echo "🚀 Auth Lambda 함수 배포 시작..."

cd lambda/auth

# 1. 의존성 설치
echo "📦 의존성 설치 중..."
pip install -r requirements.txt -t .

# 2. register 함수 패키징
echo "📦 register 함수 패키징 중..."
zip -r auth-register.zip register.py boto3/ botocore/ urllib3/ dateutil/ jmespath/ s3transfer/ six.py

# 3. login 함수 패키징  
echo "📦 login 함수 패키징 중..."
zip -r auth-login.zip login.py boto3/ botocore/ urllib3/ dateutil/ jmespath/ s3transfer/ six.py PyJWT/

# 4. register Lambda 함수 생성/업데이트
echo "🚀 register Lambda 함수 배포 중..."
aws lambda create-function \
  --function-name auth-register \
  --runtime python3.9 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler register.lambda_handler \
  --zip-file fileb://auth-register.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables='{USERS_TABLE=Users}' \
  || aws lambda update-function-code \
     --function-name auth-register \
     --zip-file fileb://auth-register.zip

# 5. login Lambda 함수 생성/업데이트
echo "🚀 login Lambda 함수 배포 중..."
aws lambda create-function \
  --function-name auth-login \
  --runtime python3.9 \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler login.lambda_handler \
  --zip-file fileb://auth-login.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables='{USERS_TABLE=Users,JWT_SECRET=your-secret-key}' \
  || aws lambda update-function-code \
     --function-name auth-login \
     --zip-file fileb://auth-login.zip

# 6. 정리
rm -rf boto3/ botocore/ urllib3/ dateutil/ jmespath/ s3transfer/ six.py PyJWT/
rm auth-register.zip auth-login.zip

echo "🎉 Auth Lambda 함수 배포 완료!"
echo ""
echo "🔧 다음 단계:"
echo "1. IAM 역할에 DynamoDB 권한 추가"
echo "2. API Gateway에서 Lambda 권한 설정"
echo "3. setup-auth-api.sh 실행"