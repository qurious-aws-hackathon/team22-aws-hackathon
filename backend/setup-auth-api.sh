#!/bin/bash

# Auth API Gateway 설정 스크립트

echo "🚀 Auth API Gateway 설정 시작..."

# 1. API Gateway 생성
API_ID=$(aws apigateway create-rest-api \
  --name "shh-place-auth-api" \
  --description "Authentication API for Shh Place" \
  --query 'id' \
  --output text)

echo "✅ API Gateway 생성됨: $API_ID"

# 2. Root Resource ID 가져오기
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[?path==`/`].id' \
  --output text)

# 3. /auth 리소스 생성
AUTH_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part "auth" \
  --query 'id' \
  --output text)

echo "✅ /auth 리소스 생성됨: $AUTH_RESOURCE_ID"

# 4. /auth/register 리소스 생성
REGISTER_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $AUTH_RESOURCE_ID \
  --path-part "register" \
  --query 'id' \
  --output text)

# 5. /auth/login 리소스 생성
LOGIN_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $AUTH_RESOURCE_ID \
  --path-part "login" \
  --query 'id' \
  --output text)

echo "✅ /auth/register, /auth/login 리소스 생성됨"

# 6. Lambda 함수 ARN (실제 함수명으로 변경 필요)
REGISTER_LAMBDA_ARN="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:auth-register"
LOGIN_LAMBDA_ARN="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:auth-login"

# 7. POST 메서드 생성 및 Lambda 연결 (register)
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $REGISTER_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $REGISTER_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$REGISTER_LAMBDA_ARN/invocations"

# 8. POST 메서드 생성 및 Lambda 연결 (login)
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $LOGIN_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $LOGIN_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/$LOGIN_LAMBDA_ARN/invocations"

# 9. CORS 설정
for RESOURCE_ID in $REGISTER_RESOURCE_ID $LOGIN_RESOURCE_ID; do
  # OPTIONS 메서드 추가
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE

  # OPTIONS 응답 설정
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters method.response.header.Access-Control-Allow-Headers=false,method.response.header.Access-Control-Allow-Methods=false,method.response.header.Access-Control-Allow-Origin=false

  # OPTIONS 통합 설정
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}'

  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"}'
done

# 10. 배포
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod

echo "🎉 Auth API Gateway 설정 완료!"
echo "📍 API 엔드포인트: https://$API_ID.execute-api.us-east-1.amazonaws.com/prod"
echo ""
echo "🔧 다음 단계:"
echo "1. Lambda 함수 배포 (register.py, login.py)"
echo "2. Lambda 권한 설정"
echo "3. 프론트엔드 config.ts에 새 API URL 추가"