# AWS 리소스 롤백 계획서

## 현재 AWS 리소스 상태 (백업 기준점)

### 1. Lambda 함수
```bash
# 현재 운영 중인 함수들
- populationAPI (운영 중)
- collectPopulationData (운영 중)

# 현재 버전 정보
populationAPI: $LATEST (RevisionId: 252507dd-22a3-41a4-aed3-12ff01ceff1f)
collectPopulationData: $LATEST
```

### 2. DynamoDB 테이블
```bash
# 현재 테이블들
- PlacesCurrent (운영 중, 100개 레코드)
- PlacesHistory (생성됨, 미사용)

# 백업 상태
- Point-in-Time Recovery: 비활성화
- 온디맨드 백업: 없음
```

### 3. API Gateway
```bash
# 현재 API
- population-api (48hywqoyra)
- 엔드포인트: /population (GET, OPTIONS)
- CORS 설정 완료
- 배포 스테이지: prod
```

### 4. EventBridge
```bash
# 현재 규칙
- PopulationDataCollector (rate(1 hour))
- 타겟: collectPopulationData Lambda
```

### 5. IAM 역할
```bash
# 현재 역할
- lambda-api-role (DynamoDB 권한 포함)
```

## 롤백 가능성 분석

### ✅ 완전 롤백 가능한 리소스

#### 1. Lambda 함수
- **방법**: 기존 함수 코드 재배포
- **소요시간**: 1분
- **데이터 손실**: 없음
```bash
# 롤백 명령어
aws lambda update-function-code \
  --function-name populationAPI \
  --zip-file fileb://backup/populationAPI-backup.zip
```

#### 2. 새로 생성할 리소스들
- **DynamoDB 테이블**: 삭제 가능 (RealtimeCrowdData)
- **Lambda 함수**: 삭제 가능 (realtimeCrowdCollector)
- **EventBridge 규칙**: 삭제 가능 (RealtimeCrowdCollector)

### ⚠️ 주의 필요한 리소스

#### 1. DynamoDB 기존 테이블
- **PlacesCurrent**: 수정하지 않음 (안전)
- **PlacesHistory**: 수정하지 않음 (안전)

#### 2. API Gateway
- **기존 엔드포인트**: 수정하지 않음 (안전)
- **새 엔드포인트**: 추가 시 삭제 가능

## 롤백 전략

### 1. 코드 레벨 롤백 (즉시 가능)
```bash
# Git 브랜치 롤백
git checkout main

# Lambda 함수 롤백 (현재 코드로)
cd backend/functions
zip -r populationAPI-rollback.zip populationAPI.js node_modules/
aws lambda update-function-code \
  --function-name populationAPI \
  --zip-file fileb://populationAPI-rollback.zip
```

### 2. 인프라 레벨 롤백 (5분 소요)
```bash
# 새로 생성된 리소스 삭제
aws dynamodb delete-table --table-name RealtimeCrowdData
aws lambda delete-function --function-name realtimeCrowdCollector
aws events delete-rule --name RealtimeCrowdCollector
```

### 3. 완전 롤백 스크립트
```bash
#!/bin/bash
# rollback.sh

echo "🔄 AWS 리소스 롤백 시작..."

# 1. Lambda 함수 롤백
echo "📦 Lambda 함수 롤백 중..."
aws lambda update-function-code \
  --function-name populationAPI \
  --zip-file fileb://backup/populationAPI-original.zip

# 2. 새 리소스 삭제
echo "🗑️ 새로 생성된 리소스 삭제 중..."
aws dynamodb delete-table --table-name RealtimeCrowdData 2>/dev/null || true
aws lambda delete-function --function-name realtimeCrowdCollector 2>/dev/null || true
aws events remove-targets --rule RealtimeCrowdCollector --ids 1 2>/dev/null || true
aws events delete-rule --name RealtimeCrowdCollector 2>/dev/null || true

# 3. Git 롤백
echo "🌿 Git 브랜치 롤백 중..."
git checkout main

echo "✅ 롤백 완료!"
```

## 백업 생성

### 1. 현재 Lambda 함수 백업
```bash
# 백업 디렉토리 생성
mkdir -p backup

# 현재 Lambda 함수 코드 백업
cd backend/functions
cp populationAPI.js ../../backup/populationAPI-original.js
zip -r ../../backup/populationAPI-original.zip populationAPI.js node_modules/
```

### 2. DynamoDB 데이터 백업 (선택사항)
```bash
# 현재 데이터 백업
aws dynamodb scan --table-name PlacesCurrent > backup/PlacesCurrent-backup.json
```

### 3. 설정 파일 백업
```bash
# 현재 설정 백업
cp -r docs backup/docs-backup
cp package.json backup/
cp .gitignore backup/
```

## 롤백 시나리오별 대응

### 시나리오 1: 새 기능이 작동하지 않음
- **대응**: Lambda 함수만 롤백 (1분)
- **영향**: 없음 (기존 시스템으로 복구)

### 시나리오 2: 성능 저하 발생
- **대응**: 새 로직 비활성화, 기존 로직으로 폴백
- **영향**: 최소 (코드 수정만 필요)

### 시나리오 3: 비용 급증
- **대응**: 새 리소스 즉시 삭제
- **영향**: 없음 (기존 시스템 유지)

### 시나리오 4: 전체 시스템 장애
- **대응**: 완전 롤백 스크립트 실행
- **영향**: 5분 내 완전 복구

## 안전 장치

### 1. 단계적 배포
```javascript
// 기존 로직과 새 로직 병행 운영
const getEnhancedCrowdLevel = async (place) => {
  try {
    // 새 로직 시도
    const enhanced = await getRealtimeCrowdData(place);
    return enhanced;
  } catch (error) {
    console.log('Fallback to original system:', error.message);
    // 기존 로직으로 폴백
    return getOriginalCrowdLevel(place);
  }
};
```

### 2. 기능 플래그
```javascript
const ENABLE_REALTIME_CROWD = process.env.ENABLE_REALTIME_CROWD === 'true';

if (ENABLE_REALTIME_CROWD) {
  // 새 기능 사용
} else {
  // 기존 기능 사용
}
```

### 3. 모니터링 알람
```bash
# 에러율 급증 시 자동 알림
aws cloudwatch put-metric-alarm \
  --alarm-name "PopulationAPI-ErrorRate" \
  --alarm-description "API 에러율 급증" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## 롤백 체크리스트

### 배포 전 준비
- [ ] 현재 Lambda 함수 코드 백업
- [ ] DynamoDB 데이터 백업 (선택)
- [ ] Git 커밋 및 태그 생성
- [ ] 롤백 스크립트 테스트

### 배포 후 모니터링
- [ ] API 응답 시간 모니터링
- [ ] 에러율 모니터링  
- [ ] 비용 모니터링
- [ ] 사용자 피드백 수집

### 롤백 실행 시
- [ ] 롤백 스크립트 실행
- [ ] 기능 정상 동작 확인
- [ ] 모니터링 지표 정상화 확인
- [ ] 사용자 공지 (필요시)

## 결론

### ✅ 롤백 가능성: 100%

1. **즉시 롤백**: Lambda 함수 코드만 변경 (1분)
2. **부분 롤백**: 새 기능만 비활성화 (환경변수 변경)
3. **완전 롤백**: 모든 새 리소스 삭제 (5분)

### 🛡️ 안전성 보장

- 기존 리소스는 수정하지 않음
- 새 리소스만 추가 (삭제 가능)
- 단계적 배포로 리스크 최소화
- 자동 폴백 로직 내장

**결론**: AWS 리소스 롤백은 완전히 가능하며, 안전하게 새 기능을 테스트할 수 있습니다! 🚀
