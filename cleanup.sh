#!/bin/bash

set -e

echo "🗑️  쉿플레이스 인프라 정리 시작"

cd terraform

if [ ! -f "terraform.tfstate" ]; then
    echo "❌ Terraform 상태 파일이 없습니다."
    exit 1
fi

# Get bucket name before destroying
BUCKET_NAME=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")

if [ ! -z "$BUCKET_NAME" ]; then
    echo "🗂️  S3 버킷 비우는 중: $BUCKET_NAME"
    aws s3 rm s3://$BUCKET_NAME --recursive || true
fi

echo "💥 Terraform 리소스 삭제 중..."
terraform destroy -auto-approve

echo "✅ 정리 완료!"
