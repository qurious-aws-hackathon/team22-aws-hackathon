#!/bin/bash

set -e

echo "🚀 쉿플레이스 프론트엔드 배포 시작"

# Check prerequisites
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform이 설치되지 않았습니다. 'brew install terraform' 실행하세요."
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI가 설치되지 않았습니다."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS 자격 증명이 설정되지 않았습니다. 'aws configure' 실행하세요."
    exit 1
fi

echo "✅ 사전 요구사항 확인 완료"

# Deploy infrastructure
echo "📦 Terraform 인프라 배포 중..."
cd terraform

if [ ! -d ".terraform" ]; then
    echo "🔧 Terraform 초기화 중..."
    terraform init
fi

terraform plan -out=tfplan
terraform apply tfplan

# Get outputs
BUCKET_NAME=$(terraform output -raw s3_bucket_name)
CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id)
WEBSITE_URL=$(terraform output -raw website_url)

echo "✅ 인프라 배포 완료"
echo "📦 S3 버킷: $BUCKET_NAME"
echo "🌐 CloudFront ID: $CLOUDFRONT_ID"

# Build and upload frontend
echo "📁 React 앱 빌드 중..."
cd ../frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
fi

# Build React app
echo "🔨 React 앱 빌드 중..."
npm run build

# Upload built files
echo "📤 빌드된 파일 업로드 중..."
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete

echo "✅ 파일 업로드 완료"

# Invalidate CloudFront cache
echo "🔄 CloudFront 캐시 무효화 중..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "✅ 캐시 무효화 시작됨 (ID: $INVALIDATION_ID)"

echo ""
echo "🎉 배포 완료!"
echo "🌐 웹사이트 URL: $WEBSITE_URL"
echo ""
echo "📋 배포 정보:"
echo "  - S3 버킷: $BUCKET_NAME"
echo "  - CloudFront 배포 ID: $CLOUDFRONT_ID"
echo "  - 캐시 무효화 ID: $INVALIDATION_ID"
echo ""
echo "⏰ CloudFront 배포 완료까지 5-10분 소요됩니다."
echo "📱 배포 상태 확인: aws cloudfront get-invalidation --distribution-id $CLOUDFRONT_ID --id $INVALIDATION_ID"
