# ShushPlace 배포 가이드

이 디렉토리는 ShushPlace 애플리케이션을 AWS에 배포하기 위한 Terraform 코드입니다.

## 🚀 빠른 시작

```bash
# 1. AWS CLI 설정
aws configure

# 2. 배포 실행
./deploy.sh

# 3. 정리 (필요시)
./cleanup.sh
```

## 📋 배포되는 리소스

- **Lambda Functions**: 16개 서버리스 함수
- **DynamoDB Tables**: 9개 NoSQL 테이블
- **API Gateway**: REST API 엔드포인트
- **S3 + CloudFront**: 정적 웹사이트 호스팅
- **IAM Roles**: 최소 권한 보안 정책

## 🔧 사전 요구사항

- AWS CLI 설치 및 설정
- Terraform 설치 (>= 1.0)
- 적절한 AWS 권한

## 📁 구조

```
deploy/
├── main.tf              # 기본 설정
├── dynamodb.tf          # DynamoDB 테이블
├── iam.tf               # IAM 역할/정책
├── lambda.tf            # Lambda 함수
├── api_gateway.tf       # API Gateway
├── s3_cloudfront.tf     # S3/CloudFront
├── outputs.tf           # 출력값
├── lambda/              # Lambda 소스코드
├── deploy.sh            # 배포 스크립트
├── cleanup.sh           # 정리 스크립트
└── README.md            # 이 파일
```

## 💡 사용법

실제 Lambda 함수 코드를 `lambda/` 디렉토리에 넣고 `./deploy.sh`를 실행하세요.

## 🔒 보안

- 모든 Lambda 함수는 CORS 활성화
- DynamoDB 테이블 삭제 보호
- 최소 권한 IAM 정책
