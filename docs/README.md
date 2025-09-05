# 쉿플레이스 프로젝트 문서 인덱스

## 📚 문서 구조

### 🎯 프로젝트 개요
- [01. 프로젝트 개요](./01-project-overview.md) - 프로젝트 목표 및 기술 스택
- [02. 프로젝트 README](./02-project-readme.md) - 기본 프로젝트 소개

### 🏗️ 인프라 및 아키텍처
- [03. 인프라 분석](./03-infrastructure-analysis.md) - AWS 인프라 현황 분석
- [04. 스토리지 전략](./04-storage-strategy.md) - 데이터 저장 전략 비교
- [05. 지리 데이터 비교](./05-geo-data-comparison.md) - Timestream vs DynamoDB

### 📡 API 및 데이터
- [06. 서울 API 가이드](./06-seoul-api-guide.md) - 서울 열린데이터 API 사용법
- [10. 현재 API 문서](./10-current-api-documentation.md) - 현재 Population API 상세 동작
- [11. 데이터 통합](./11-data-integration.md) - 데이터 통합 전략

### 📋 작업 계획
- [07. 초기 작업 계획](./07-initial-work-plan.md) - 프로젝트 초기 계획
- [08. 업데이트된 작업 계획](./08-updated-work-plan.md) - 수정된 작업 계획
- [09. 완료된 작업 계획](./09-completed-work-plan.md) - 완료된 작업 현황

### 🚀 아키텍처 개선
- [**12. 아키텍처 개선 계획**](./12-architecture-improvement-plan.md) - **캐싱 기반 시스템 전환 계획** ⭐

## 📖 읽기 순서 추천

### 새로운 팀원용
1. [01. 프로젝트 개요](./01-project-overview.md)
2. [02. 프로젝트 README](./02-project-readme.md)
3. [10. 현재 API 문서](./10-current-api-documentation.md)
4. [**12. 아키텍처 개선 계획**](./12-architecture-improvement-plan.md) ⭐

### 개발자용
1. [06. 서울 API 가이드](./06-seoul-api-guide.md)
2. [10. 현재 API 문서](./10-current-api-documentation.md)
3. [**12. 아키텍처 개선 계획**](./12-architecture-improvement-plan.md) ⭐
4. [03. 인프라 분석](./03-infrastructure-analysis.md)

### 아키텍트용
1. [04. 스토리지 전략](./04-storage-strategy.md)
2. [05. 지리 데이터 비교](./05-geo-data-comparison.md)
3. [**12. 아키텍처 개선 계획**](./12-architecture-improvement-plan.md) ⭐
4. [03. 인프라 분석](./03-infrastructure-analysis.md)

## 🔥 현재 우선순위

### 즉시 구현 필요
- **[12. 아키텍처 개선 계획](./12-architecture-improvement-plan.md)** - 성능 문제 해결을 위한 캐싱 시스템 구축

### 현재 상태
- ✅ 서울 API 연동 완료
- ✅ DynamoDB 테이블 생성 완료
- ✅ Lambda 함수 배포 완료
- ⚠️ **성능 문제**: 응답 시간 2-5초 (개선 필요)
- 🔄 **진행 중**: 캐싱 기반 아키텍처로 전환

## 📞 문의사항

프로젝트 관련 문의사항이나 문서 개선 제안은 팀 채널을 통해 연락해주세요.
