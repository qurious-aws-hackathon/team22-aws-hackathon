# 🤫 쉿플레이스 - 조용한 장소 찾기 플랫폼

서울의 조용한 카페, 도서관, 공원을 찾고 공유하는 서버리스 웹 애플리케이션

## 🏗️ 아키텍처

```
사용자 → CloudFront (CDN) → S3 (정적 호스팅) → API Gateway → Lambda → DynamoDB
                                                                    ↓
                                                              Amazon Bedrock (AI)
```

### 기술 스택
- **프론트엔드**: HTML5, CSS3, JavaScript (Vanilla)
- **인프라**: AWS S3, CloudFront, API Gateway, Lambda, DynamoDB
- **AI**: Amazon Bedrock (Claude 3 Haiku)
- **IaC**: Terraform
- **배포**: AWS CLI

## 🚀 빠른 시작

### 사전 요구사항
```bash
# Terraform 설치
brew install terraform

# AWS CLI 설치 및 설정
brew install awscli
aws configure
```

### 배포
```bash
# 전체 배포 (인프라 + 프론트엔드)
./deploy.sh

# 또는 수동 배포
cd terraform
terraform init
terraform apply
```

### 정리
```bash
# 모든 리소스 삭제
./cleanup.sh
```

## 📁 프로젝트 구조

```
├── terraform/           # Terraform IaC 코드
│   ├── main.tf          # 메인 인프라 정의
│   ├── variables.tf     # 변수 정의
│   └── outputs.tf       # 출력값 정의
├── frontend/            # 프론트엔드 코드
│   └── index.html       # SPA 메인 페이지
├── docs/               # 문서
├── deploy.sh           # 배포 스크립트
├── cleanup.sh          # 정리 스크립트
└── README.md           # 이 파일
```

## 🔧 주요 기능

### 1. 스팟 관리
- 조용한 장소 등록/조회
- 위치 기반 검색
- 카테고리별 필터링

### 2. 사용자 인터랙션
- 좋아요/싫어요 토글
- 댓글 시스템
- 사용자 상태 확인

### 3. AI 추천 시스템
- Amazon Bedrock 기반 장소 추천
- 위치 및 선호도 기반 분석
- 실시간 추천 점수 계산

## 🌐 API 엔드포인트

### 기본 URL
```
https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod
```

### 주요 엔드포인트
- `GET /spots` - 스팟 목록 조회
- `POST /spots` - 새 스팟 등록
- `GET /spots/{id}` - 스팟 상세 조회
- `POST /spots/{id}/like` - 좋아요 토글
- `GET /spots/{id}/like-status` - 좋아요 상태 확인
- `POST /recommendations` - AI 추천

## 💰 비용 예상

### 월간 예상 비용 (트래픽 10GB 기준)
- S3 스토리지: $0.02
- CloudFront: $0.085
- Lambda: $0.20 (100만 요청)
- DynamoDB: $0.25 (읽기/쓰기)
- **총합: ~$0.56/월**

## 🔒 보안 기능

- CloudFront OAC (Origin Access Control)
- S3 버킷 퍼블릭 액세스 차단
- HTTPS 강제 리다이렉션
- CORS 정책 적용

## 📊 모니터링

### CloudWatch 메트릭
- CloudFront 요청 수
- Lambda 실행 시간
- DynamoDB 읽기/쓰기 용량
- API Gateway 응답 시간

### 로그 확인
```bash
# Lambda 로그
aws logs tail /aws/lambda/getSpots --follow

# CloudFront 액세스 로그 (선택사항)
aws s3 ls s3://cloudfront-logs-bucket/
```

## 🛠️ 개발 가이드

### 로컬 개발
```bash
# 프론트엔드 로컬 서버
cd frontend
python -m http.server 8000
# 또는
npx serve .
```

### 환경별 배포
```bash
# 개발 환경
terraform apply -var="environment=dev"

# 프로덕션 환경
terraform apply -var="environment=prod"
```

### 프론트엔드 업데이트
```bash
# 파일 변경 후 S3 동기화
aws s3 sync frontend/ s3://$(terraform output -raw s3_bucket_name) --delete

# CloudFront 캐시 무효화
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## 🐛 트러블슈팅

### 일반적인 문제

**1. Terraform 권한 오류**
```bash
# AWS 자격 증명 확인
aws sts get-caller-identity
```

**2. CloudFront 배포 지연**
- 배포 완료까지 5-10분 소요
- 상태 확인: AWS Console → CloudFront

**3. CORS 오류**
- API Gateway CORS 설정 확인
- 브라우저 개발자 도구 네트워크 탭 확인

**4. S3 버킷 이름 충돌**
```bash
# variables.tf에서 project_name 변경
terraform apply -var="project_name=your-unique-name"
```

## 📈 성능 최적화

### 캐시 전략
- CloudFront: 정적 자산 24시간 캐시
- API Gateway: 응답 캐싱 (선택사항)
- 브라우저: Service Worker 활용

### 이미지 최적화
```html
<!-- 레이지 로딩 -->
<img loading="lazy" src="image.jpg" alt="description">

<!-- WebP 지원 -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="description">
</picture>
```

## 🔄 CI/CD 파이프라인 (향후 계획)

```yaml
# .github/workflows/deploy.yml
name: Deploy Frontend
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
      - name: Deploy Infrastructure
        run: terraform apply -auto-approve
      - name: Upload Frontend
        run: aws s3 sync frontend/ s3://$BUCKET_NAME
```

## 📞 지원

- **이슈 리포트**: GitHub Issues
- **문서**: `/docs` 디렉토리
- **API 문서**: `/docs/14-api-specification.md`

## 📄 라이선스

MIT License

---

**마지막 업데이트**: 2025-09-05  
**버전**: 1.0.0
