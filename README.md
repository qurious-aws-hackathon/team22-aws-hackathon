# Team22 - Qurious: 쉿플레이스 (ShushPlace)
쉿플레이스는 서울의 조용한 장소를 찾고 공유하는 서버리스 웹 애플리케이션입니다.

## 어플리케이션 개요

쉿플레이스는 도심 속에서 조용하고 집중할 수 있는 공간을 찾기 어려워하는 사람들을 위한 플랫폼입니다. 사용자들이 직접 발견한 조용한 카페, 도서관, 공원 등을 등록하고 공유할 수 있으며, Amazon Bedrock AI를 활용한 개인화된 장소 추천 서비스를 제공합니다.

**핵심 가치**
- 🤫 **조용함**: 소음 없는 평화로운 공간 발견
- 🤝 **공유**: 커뮤니티 기반 정보 공유
- 🎯 **개인화**: AI 기반 맞춤형 장소 추천

**기술적 특징**
- 완전 서버리스 아키텍처로 비용 효율성 극대화
- Amazon Bedrock Claude 3 Haiku를 활용한 지능형 추천 시스템
- Terraform을 통한 Infrastructure as Code 구현

## 주요 기능

### 1. 스팟 관리 시스템
- **장소 등록**: 사용자가 발견한 조용한 장소를 사진과 함께 등록
- **위치 기반 검색**: 현재 위치 주변의 조용한 장소 실시간 검색
- **카테고리 필터링**: 카페, 도서관, 공원, 스터디룸 등 용도별 분류
- **상세 정보**: 운영시간, 와이파이, 콘센트 등 편의시설 정보 제공

### 2. 사용자 인터랙션
- **좋아요/싫어요**: 장소에 대한 평가 시스템
- **댓글 시스템**: 실시간 후기 및 팁 공유
- **사용자 상태 확인**: 개인별 좋아요 기록 관리
- **실시간 업데이트**: 새로운 정보 즉시 반영

### 3. AI 추천 시스템
- **Amazon Bedrock 연동**: Claude 3 Haiku 모델 활용
- **개인화 추천**: 사용자 선호도 및 위치 기반 맞춤 추천
- **상황별 추천**: 시간대, 날씨, 목적에 따른 최적 장소 제안
- **실시간 점수 계산**: 다양한 요소를 종합한 추천 점수 산출

## 동영상 데모

<!-- 실제 데모 영상으로 교체 예정 -->
![데모 영상](./docs/demo.gif)

*데모 영상: 쉿플레이스 주요 기능 시연*

## 리소스 배포하기

### 아키텍처 다이어그램
```
사용자 → CloudFront (CDN) → S3 (정적 호스팅) → API Gateway → Lambda → DynamoDB
                                                                    ↓
                                                              Amazon Bedrock (AI)
```

### 사전 요구사항
```bash
# Terraform 설치
brew install terraform

# AWS CLI 설치 및 설정
brew install awscli
aws configure
```

### 배포 방법

#### 1. 자동 배포 (권장)
```bash
# 전체 배포 (인프라 + 프론트엔드)
./deploy.sh
```

#### 2. 수동 배포
```bash
# 인프라 배포
cd terraform
terraform init
terraform apply

# 프론트엔드 배포
aws s3 sync frontend/ s3://$(terraform output -raw s3_bucket_name) --delete
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

### 배포 결과 확인
```bash
# 배포된 URL 확인
terraform output cloudfront_domain_name

# API 엔드포인트 확인
terraform output api_gateway_url
```

### 리소스 삭제
```bash
# 모든 AWS 리소스 삭제
./cleanup.sh

# 또는 수동 삭제
cd terraform
terraform destroy
```

## 프로젝트 기대 효과 및 예상 사용 사례

### 기대 효과

#### 1. 사회적 가치
- **현대인의 스트레스 관리**: 조용한 공간 접근성 향상으로 도시민 스트레스 감소
- **커뮤니티 활성화**: 지역 기반 정보 공유 문화 조성
- **공간 활용도 증대**: 숨겨진 조용한 공간들의 재발견 및 활용

#### 2. 기술적 가치
- **서버리스 아키텍처 모범 사례**: 비용 효율적인 클라우드 네이티브 솔루션 제시
- **AI 활용 실용 사례**: Amazon Bedrock을 활용한 실생활 문제 해결
- **Infrastructure as Code**: Terraform을 통한 재현 가능한 인프라 구축

### 예상 사용 사례

#### 1. 개인 사용자
- **재택근무자**: 집중이 필요한 업무를 위한 조용한 카페 검색
- **수험생**: 도서관 외 대안 학습 공간 발견
- **프리랜서**: 미팅이나 작업을 위한 조용한 공간 예약
- **독서 애호가**: 책 읽기 좋은 조용한 장소 탐색

#### 2. 비즈니스 활용
- **카페 사장**: 조용한 환경을 강점으로 하는 마케팅 채널
- **도서관**: 이용률 증대 및 서비스 홍보
- **코워킹 스페이스**: 조용한 업무 환경 어필
- **관광업**: 현지인만 아는 조용한 명소 소개

---
### 로컬 및 배포 서비스 테스트 계정정보
- url: https://d365b0i7igooja.cloudfront.net/  
- 계정 정보
  - ID: amazon
  - PW: 123123
---
**개발팀**: Team22  
**개발 기간**: 2025.09.05 ~ 2025.09.06
