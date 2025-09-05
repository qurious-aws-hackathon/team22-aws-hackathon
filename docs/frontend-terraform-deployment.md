# 🚀 프론트엔드 Terraform 배포 가이드

## 📋 목차
1. [개요](#개요)
2. [아키텍처](#아키텍처)
3. [사전 요구사항](#사전-요구사항)
4. [Terraform 구성](#terraform-구성)
5. [배포 과정](#배포-과정)
6. [변수 및 데이터 처리](#변수-및-데이터-처리)
7. [보안 설정](#보안-설정)
8. [모니터링 및 로그](#모니터링-및-로그)
9. [트러블슈팅](#트러블슈팅)
10. [비용 최적화](#비용-최적화)

---

## 개요

쉿플레이스 프론트엔드는 **React + Vite** 기반의 SPA(Single Page Application)로, AWS의 서버리스 아키텍처를 활용하여 배포됩니다.

### 핵심 특징
- **서버리스**: EC2 없이 S3 + CloudFront로 구성
- **글로벌 CDN**: CloudFront를 통한 전 세계 빠른 접근
- **보안**: OAC(Origin Access Control) 적용
- **비용 효율**: 사용량 기반 과금
- **자동 스케일링**: 트래픽에 따른 자동 확장

---

## 아키텍처

```
사용자 요청 → CloudFront (CDN) → S3 (정적 호스팅)
                    ↓
              캐시 및 압축 최적화
                    ↓
            React SPA 애플리케이션
```

### AWS 리소스 구성
| 리소스 | 역할 | 설정 |
|--------|------|------|
| **S3 Bucket** | 정적 파일 저장소 | 웹사이트 호스팅, 버전 관리 |
| **CloudFront** | 글로벌 CDN | 캐시, 압축, HTTPS |
| **OAC** | 보안 액세스 제어 | S3 직접 접근 차단 |
| **Route 53** | DNS (선택사항) | 커스텀 도메인 |

---

## 사전 요구사항

### 1. 개발 환경
```bash
# 필수 도구 설치
brew install terraform
brew install awscli
brew install node
```

### 2. AWS 자격 증명 설정
```bash
aws configure
# AWS Access Key ID: [YOUR_ACCESS_KEY]
# AWS Secret Access Key: [YOUR_SECRET_KEY]
# Default region name: us-east-1
# Default output format: json
```

### 3. 권한 요구사항
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "cloudfront:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Terraform 구성

### 디렉토리 구조
```
terraform/
├── main.tf           # 메인 인프라 정의
├── variables.tf      # 변수 정의
├── outputs.tf        # 출력값 정의
├── .terraform/       # Terraform 상태 (Git 제외)
├── terraform.tfstate # 상태 파일 (Git 제외)
└── tfplan           # 실행 계획 (Git 제외)
```

### 1. 변수 정의 (variables.tf)
```hcl
variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "프로젝트 이름 (리소스 명명에 사용)"
  type        = string
  default     = "shitplace"
}

variable "environment" {
  description = "환경 (dev, staging, prod)"
  type        = string
  default     = "prod"
}
```

### 2. 메인 인프라 (main.tf)

#### Provider 설정
```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

#### S3 버킷 생성
```hcl
# 고유한 버킷 이름을 위한 랜덤 문자열
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 버킷 (정적 웹사이트 호스팅)
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${random_string.bucket_suffix.result}"
}

# 버전 관리 활성화
resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

# 웹사이트 설정
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"  # SPA 라우팅 지원
  }
}
```

#### CloudFront 배포
```hcl
# Origin Access Control (OAC)
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for ${var.project_name} frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront 배포
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
    origin_id                = "S3-${aws_s3_bucket.frontend.bucket}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"  # 비용 최적화

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # AWS 관리형 정책
  }

  # SPA 라우팅 지원
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-frontend"
    Environment = var.environment
  }
}
```

#### 보안 정책
```hcl
# S3 버킷 정책 (CloudFront만 접근 허용)
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# 퍼블릭 액세스 차단
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### 3. 출력값 (outputs.tf)
```hcl
output "s3_bucket_name" {
  description = "S3 버킷 이름"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront 배포 ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront 도메인 이름"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "website_url" {
  description = "웹사이트 URL"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}
```

---

## 배포 과정

### 1. 자동 배포 스크립트 (deploy.sh)
```bash
#!/bin/bash
set -e

echo "🚀 쉿플레이스 프론트엔드 배포 시작"

# 사전 요구사항 확인
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform이 설치되지 않았습니다."
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS 자격 증명이 설정되지 않았습니다."
    exit 1
fi

echo "✅ 사전 요구사항 확인 완료"

# Terraform 인프라 배포
echo "📦 Terraform 인프라 배포 중..."
cd terraform

if [ ! -d ".terraform" ]; then
    echo "🔧 Terraform 초기화 중..."
    terraform init
fi

terraform plan -out=tfplan
terraform apply tfplan

# 출력값 가져오기
BUCKET_NAME=$(terraform output -raw s3_bucket_name)
CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id)
WEBSITE_URL=$(terraform output -raw website_url)

echo "✅ 인프라 배포 완료"

# React 앱 빌드 및 업로드
echo "📁 React 앱 빌드 중..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "📦 의존성 설치 중..."
    npm install
fi

echo "🔨 React 앱 빌드 중..."
npm run build

echo "📤 빌드된 파일 업로드 중..."
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete

echo "✅ 파일 업로드 완료"

# CloudFront 캐시 무효화
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
```

### 2. 단계별 수동 배포

#### Step 1: Terraform 초기화
```bash
cd terraform
terraform init
```

#### Step 2: 배포 계획 확인
```bash
terraform plan -out=tfplan
```

#### Step 3: 인프라 배포
```bash
terraform apply tfplan
```

#### Step 4: React 앱 빌드
```bash
cd ../frontend
npm install
npm run build
```

#### Step 5: S3 업로드
```bash
BUCKET_NAME=$(cd ../terraform && terraform output -raw s3_bucket_name)
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete
```

#### Step 6: 캐시 무효화
```bash
CLOUDFRONT_ID=$(cd ../terraform && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
```

---

## 변수 및 데이터 처리

### 1. Terraform 변수 관리

#### 환경별 변수 파일
```bash
# 개발 환경
terraform apply -var="environment=dev" -var="project_name=shitplace-dev"

# 프로덕션 환경
terraform apply -var="environment=prod" -var="project_name=shitplace"
```

#### terraform.tfvars 파일 사용
```hcl
# terraform.tfvars
aws_region   = "us-east-1"
project_name = "shitplace"
environment  = "prod"
```

### 2. 환경 변수 처리

#### 프론트엔드 환경 변수 (.env)
```bash
# .env (Git에서 제외됨)
VITE_KAKAO_API_KEY=your_kakao_api_key_here
SEOUL_OPEN_DATA_API_KEY=your_seoul_api_key_here
```

#### 환경 변수 템플릿 (.env.example)
```bash
# .env (Git에 포함됨)
VITE_KAKAO_API_KEY=your_kakao_api_key_here
SEOUL_OPEN_DATA_API_KEY=your_seoul_api_key_here
```

### 3. 상태 관리

#### 로컬 상태 파일
```bash
terraform/
├── terraform.tfstate      # 현재 상태
├── terraform.tfstate.backup  # 백업 상태
└── .terraform/            # 프로바이더 캐시
```

#### 원격 상태 관리 (권장)
```hcl
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "frontend/terraform.tfstate"
    region = "us-east-1"
    
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

---

## 보안 설정

### 1. S3 보안
- **퍼블릭 액세스 차단**: 모든 퍼블릭 액세스 차단
- **버킷 정책**: CloudFront만 접근 허용
- **암호화**: AES-256 서버 측 암호화

### 2. CloudFront 보안
- **OAC**: Origin Access Control로 S3 직접 접근 차단
- **HTTPS**: 모든 HTTP 요청을 HTTPS로 리다이렉트
- **압축**: Gzip 압축으로 대역폭 절약

### 3. 민감 데이터 관리
```bash
# Git에서 제외되는 파일들
.env
terraform.tfstate
terraform.tfstate.backup
tfplan
.terraform/
```

---

## 모니터링 및 로그

### 1. CloudWatch 메트릭
```bash
# CloudFront 메트릭 확인
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=E1OM4HUWK7JNKT \
  --start-time 2025-09-05T00:00:00Z \
  --end-time 2025-09-05T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### 2. 로그 확인
```bash
# Lambda 로그 (해당 시)
aws logs tail /aws/lambda/function-name --follow

# CloudFront 액세스 로그 활성화
resource "aws_s3_bucket" "logs" {
  bucket = "${var.project_name}-cloudfront-logs"
}

resource "aws_cloudfront_distribution" "frontend" {
  # ... 기존 설정 ...
  
  logging_config {
    include_cookies = false
    bucket         = aws_s3_bucket.logs.bucket_domain_name
    prefix         = "cloudfront-logs/"
  }
}
```

### 3. 상태 확인 명령어
```bash
# 인프라 상태 확인
terraform show

# AWS 리소스 확인
aws s3 ls s3://bucket-name/
aws cloudfront get-distribution --id DISTRIBUTION_ID

# 웹사이트 상태 확인
curl -I https://your-domain.com
```

---

## 트러블슈팅

### 1. 일반적인 문제들

#### 문제: Terraform 권한 오류
```bash
# 해결: AWS 자격 증명 확인
aws sts get-caller-identity
aws configure list
```

#### 문제: S3 버킷 이름 충돌
```bash
# 해결: 프로젝트 이름 변경
terraform apply -var="project_name=your-unique-name"
```

#### 문제: CloudFront 배포 지연
```bash
# 해결: 배포 상태 확인 (5-10분 소요)
aws cloudfront get-distribution --id DISTRIBUTION_ID --query 'Distribution.Status'
```

#### 문제: React 앱 빌드 실패
```bash
# 해결: 의존성 재설치
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 2. 디버깅 명령어
```bash
# Terraform 디버그 모드
export TF_LOG=DEBUG
terraform apply

# AWS CLI 디버그
aws s3 ls --debug

# 네트워크 연결 테스트
curl -v https://your-domain.com
```

### 3. 롤백 절차
```bash
# 이전 Terraform 상태로 롤백
terraform state pull > backup.tfstate
terraform state push backup.tfstate

# 이전 S3 버전으로 롤백
aws s3api list-object-versions --bucket bucket-name
aws s3api restore-object --bucket bucket-name --key index.html --version-id VERSION_ID
```

---

## 비용 최적화

### 1. 예상 비용 (월간)
| 서비스 | 사용량 | 비용 |
|--------|--------|------|
| **S3 스토리지** | 1GB | $0.023 |
| **S3 요청** | 10,000회 | $0.004 |
| **CloudFront** | 10GB 전송 | $0.085 |
| **CloudFront 요청** | 100만회 | $0.75 |
| **총 예상 비용** | | **~$0.86/월** |

### 2. 비용 절약 방법

#### CloudFront 가격 클래스 최적화
```hcl
resource "aws_cloudfront_distribution" "frontend" {
  price_class = "PriceClass_100"  # 북미, 유럽만 (가장 저렴)
  # price_class = "PriceClass_200"  # 아시아 포함
  # price_class = "PriceClass_All"  # 전 세계 (가장 비쌈)
}
```

#### S3 스토리지 클래스 최적화
```hcl
resource "aws_s3_bucket_lifecycle_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    id     = "transition_to_ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}
```

### 3. 비용 모니터링
```bash
# AWS Cost Explorer API
aws ce get-cost-and-usage \
  --time-period Start=2025-09-01,End=2025-09-30 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

## 정리 및 삭제

### 1. 리소스 정리 스크립트 (cleanup.sh)
```bash
#!/bin/bash
set -e

echo "🗑️ 쉿플레이스 인프라 정리 시작"

cd terraform

# S3 버킷 비우기
BUCKET_NAME=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
if [ ! -z "$BUCKET_NAME" ]; then
    echo "📦 S3 버킷 비우는 중: $BUCKET_NAME"
    aws s3 rm s3://$BUCKET_NAME --recursive
fi

# Terraform 리소스 삭제
echo "🔥 Terraform 리소스 삭제 중..."
terraform destroy -auto-approve

echo "✅ 정리 완료!"
```

### 2. 수동 정리
```bash
# S3 버킷 비우기
aws s3 rm s3://bucket-name --recursive

# Terraform 삭제
terraform destroy

# 로컬 상태 파일 삭제
rm -rf .terraform terraform.tfstate*
```

---

## 참고 자료

### 공식 문서
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS S3 정적 웹사이트 호스팅](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [AWS CloudFront 사용자 가이드](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/)

### 유용한 명령어
```bash
# Terraform 상태 확인
terraform state list
terraform state show aws_s3_bucket.frontend

# AWS 리소스 태그 확인
aws resourcegroupstaggingapi get-resources --tag-filters Key=Environment,Values=prod

# CloudFront 캐시 통계
aws cloudfront get-distribution-config --id DISTRIBUTION_ID
```

---

**마지막 업데이트**: 2025-09-05  
**작성자**: AWS 해커톤 Team 22  
**버전**: 1.0.0
