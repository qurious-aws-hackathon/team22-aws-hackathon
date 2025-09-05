#!/bin/bash
# AWS 리소스 완전 롤백 스크립트

echo "🔄 AWS 리소스 롤백 시작..."

# 1. Lambda 함수 롤백
echo "📦 Lambda 함수 롤백 중..."
cd backend/functions
zip -r ../../backup/populationAPI-rollback.zip populationAPI.js node_modules/ > /dev/null 2>&1
cd ../..

aws lambda update-function-code \
  --function-name populationAPI \
  --zip-file fileb://backup/populationAPI-rollback.zip > /dev/null

# 2. 새 리소스 삭제
echo "🗑️ 새로 생성된 리소스 삭제 중..."
aws dynamodb delete-table --table-name RealtimeCrowdData > /dev/null 2>&1 || true
aws lambda delete-function --function-name realtimeCrowdCollector > /dev/null 2>&1 || true
aws events remove-targets --rule RealtimeCrowdCollector --ids 1 > /dev/null 2>&1 || true
aws events delete-rule --name RealtimeCrowdCollector > /dev/null 2>&1 || true

# 3. Git 롤백
echo "🌿 Git 브랜치 롤백 중..."
git checkout main > /dev/null 2>&1

echo "✅ 롤백 완료! 기존 시스템으로 복구되었습니다."
