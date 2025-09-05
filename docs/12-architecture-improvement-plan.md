# 아키텍처 개선 계획: 캐싱 기반 시스템으로 전환

## 현재 문제점 분석

### 1. 성능 문제
- **응답 시간**: 2-5초 (외부 API 의존)
- **사용자 경험**: 느린 응답으로 인한 UX 저하
- **동시 접속**: 다수 사용자 접속 시 더욱 느려짐

### 2. 비용 및 효율성 문제
- **불필요한 API 호출**: 동일한 데이터를 반복 요청
- **외부 API 의존성**: 서울시 API 장애 시 서비스 전체 중단
- **Lambda 실행 시간**: 긴 실행 시간으로 인한 비용 증가

### 3. 확장성 문제
- **트래픽 증가**: 사용자 증가 시 외부 API 부하
- **Rate Limiting**: 서울시 API 호출 제한 가능성
- **데이터 일관성**: 동시 요청 시 다른 데이터 반환 가능

## 개선된 아키텍처 설계

### 1. 새로운 시스템 구조

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   사용자 요청    │───▶│   API Gateway    │───▶│  Query Lambda   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │   DynamoDB      │
                                               │  (캐시된 데이터)  │
                                               └─────────────────┘
                                                         ▲
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  EventBridge    │───▶│   Scheduler      │───▶│ Collector Lambda│
│   (Cron Job)    │    │   (매시간)       │    │  (데이터 수집)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │   서울시 API    │
                                               └─────────────────┘
```

### 2. 컴포넌트별 역할

#### 2.1 Data Collector Lambda
- **실행 주기**: 매시간 (EventBridge 스케줄러)
- **기능**: 서울시 API 호출 및 DynamoDB 저장
- **오류 처리**: 실패 시 재시도 로직
- **데이터 검증**: 수집된 데이터 품질 검사

#### 2.2 Query Lambda (기존 populationAPI 개선)
- **기능**: DynamoDB에서 데이터 조회
- **응답 시간**: 100-200ms (캐시된 데이터)
- **필터링**: 지리적 위치 기반 실시간 필터링
- **정렬**: 조용한 곳 우선 정렬

#### 2.3 DynamoDB 테이블 설계
```json
{
  "TableName": "PopulationData",
  "KeySchema": [
    {
      "AttributeName": "areaCode",
      "KeyType": "HASH"
    },
    {
      "AttributeName": "timestamp",
      "KeyType": "RANGE"
    }
  ],
  "GlobalSecondaryIndexes": [
    {
      "IndexName": "TimestampIndex",
      "KeySchema": [
        {
          "AttributeName": "timestamp",
          "KeyType": "HASH"
        }
      ]
    },
    {
      "IndexName": "LocationIndex",
      "KeySchema": [
        {
          "AttributeName": "geoHash",
          "KeyType": "HASH"
        }
      ]
    }
  ]
}
```

## 구현 계획

### Phase 1: 데이터 수집 시스템 구축 (1-2시간)

#### 1.1 Data Collector Lambda 생성
```javascript
// collectPopulationData.js
exports.handler = async (event) => {
  try {
    // 1. 서울시 API 호출
    const seoulData = await fetchSeoulAPI();
    
    // 2. 데이터 변환 및 매핑
    const processedData = processSeoulData(seoulData);
    
    // 3. DynamoDB 배치 저장
    await saveToDynamoDB(processedData);
    
    // 4. 성공 로그
    console.log(`Successfully collected ${processedData.length} records`);
    
    return { statusCode: 200, message: 'Data collection completed' };
  } catch (error) {
    console.error('Data collection failed:', error);
    throw error;
  }
};
```

#### 1.2 EventBridge 스케줄러 설정
```bash
aws events put-rule \
  --name "PopulationDataCollector" \
  --schedule-expression "rate(1 hour)" \
  --description "Collect Seoul population data every hour"
```

#### 1.3 DynamoDB 테이블 생성
- 기존 PlacesCurrent 테이블 활용 또는 새 테이블 생성
- TTL 설정으로 오래된 데이터 자동 삭제
- GSI로 효율적인 쿼리 지원

### Phase 2: Query API 개선 (30분-1시간)

#### 2.1 populationAPI Lambda 수정
```javascript
// 기존: 서울 API 호출
const seoulData = await fetchRealSeoulData();

// 개선: DynamoDB 조회
const cachedData = await queryFromDynamoDB();
```

#### 2.2 캐시 무효화 로직
- 데이터 수집 시간 확인
- 1시간 이상 오래된 데이터 감지 시 알림

### Phase 3: 모니터링 및 최적화 (30분)

#### 3.1 CloudWatch 대시보드
- 데이터 수집 성공률
- API 응답 시간
- DynamoDB 사용량

#### 3.2 알림 설정
- 데이터 수집 실패 시 SNS 알림
- API 응답 시간 임계값 초과 시 알림

## 예상 효과

### 1. 성능 개선
- **응답 시간**: 2-5초 → 100-200ms (95% 개선)
- **동시 처리**: 외부 API 의존성 제거로 확장성 향상
- **안정성**: 서울 API 장애와 무관한 서비스 운영

### 2. 비용 최적화
- **Lambda 실행 시간**: 평균 80% 단축
- **외부 API 호출**: 시간당 1회로 제한
- **DynamoDB 비용**: 추가 발생하지만 Lambda 비용 절감으로 상쇄

### 3. 사용자 경험 향상
- **즉시 응답**: 빠른 데이터 로딩
- **일관된 성능**: 트래픽과 무관한 안정적 응답
- **오프라인 대응**: 외부 API 장애 시에도 서비스 지속

## 마이그레이션 전략

### 1. 점진적 전환
1. **병렬 운영**: 기존 API와 새 시스템 동시 운영
2. **A/B 테스트**: 일부 트래픽을 새 시스템으로 라우팅
3. **성능 검증**: 응답 시간 및 데이터 정확성 확인
4. **완전 전환**: 검증 완료 후 기존 시스템 제거

### 2. 롤백 계획
- 기존 Lambda 함수 보존
- 문제 발생 시 즉시 기존 시스템으로 복구
- 데이터 동기화 확인

## 구현 우선순위

### 높음 (즉시 구현)
1. ✅ Data Collector Lambda 생성
2. ✅ EventBridge 스케줄러 설정
3. ✅ DynamoDB 테이블 준비

### 중간 (1-2일 내)
4. ✅ Query API 수정
5. ✅ 성능 테스트
6. ✅ 모니터링 설정

### 낮음 (추후 개선)
7. 🔄 고급 캐싱 전략
8. 🔄 데이터 압축
9. 🔄 지역별 세분화

## 결론

제안하신 캐싱 기반 아키텍처는 **현재 시스템의 모든 문제점을 해결하는 최적의 솔루션**입니다. 

**핵심 이점:**
- 95% 성능 향상 (2-5초 → 100-200ms)
- 외부 API 의존성 최소화
- 확장 가능한 아키텍처
- 비용 효율성

**구현 복잡도:** 낮음 (기존 인프라 활용)
**예상 구현 시간:** 2-3시간
**ROI:** 매우 높음

즉시 구현을 시작하는 것을 강력히 권장합니다.
