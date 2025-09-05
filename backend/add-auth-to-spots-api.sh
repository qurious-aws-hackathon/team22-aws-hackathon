#!/bin/bash

# 기존 Spots API Gateway에 auth 경로 추가

API_ID="xx42krmzqc"  # 기존 spots API ID

echo "🚀 기존 API Gateway에 auth 경로 추가 중..."

# 1. Root Resource ID 가져오기
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[?path==`/`].id' \
  --output text)

# 2. /auth 리소스 생성
AUTH_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_RESOURCE_ID \
  --path-part "auth" \
  --query 'id' \
  --output text)

# 3. /auth/register 리소스 생성
REGISTER_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $AUTH_RESOURCE_ID \
  --path-part "register" \
  --query 'id' \
  --output text)

# 4. /auth/login 리소스 생성
LOGIN_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $AUTH_RESOURCE_ID \
  --path-part "login" \
  --query 'id' \
  --output text)

echo "✅ auth 리소스 생성 완료"

# 5. Lambda 함수 ARN (실제 계정 ID로 변경 필요)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTER_LAMBDA_ARN="arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:auth-register"
LOGIN_LAMBDA_ARN="arn:aws:lambda:us-east-1:$ACCOUNT_ID:function:auth-login"

# 6. POST 메서드 및 통합 설정 (register)
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

# 7. POST 메서드 및 통합 설정 (login)
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

# 8. Lambda 권한 추가
aws lambda add-permission \
  --function-name auth-register \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*"

aws lambda add-permission \
  --function-name auth-login \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:$ACCOUNT_ID:$API_ID/*/*"

# 9. 배포
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod

echo "🎉 기존 API Gateway에 auth 경로 추가 완료!"
echo "📍 엔드포인트:"
echo "  - POST https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/auth/register"
echo "  - POST https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/auth/login"