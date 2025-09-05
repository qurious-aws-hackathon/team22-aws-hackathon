# 버스 승객수 API를 활용한 혼잡도 개선 계획서

## 개요
교통정책지원시스템(TAIMS)의 일자별-시간대별-버스노선별-구간별-승객수 API를 활용하여 기존 서울시 생활인구 API의 혼잡도 정확도를 향상시키는 계획입니다.

## API 적절성 검토

### ✅ 적절한 이유

1. **실시간성**: 시간대별 데이터로 현재 시간 기준 혼잡도 추정 가능
2. **지역별 세분화**: 버스 정류장 단위로 지역별 교통량 파악 가능
3. **혼잡도 지표**: 재차인원, 용량초과 데이터로 직접적인 혼잡도 측정
4. **보완적 데이터**: 생활인구 + 교통량으로 더 정확한 혼잡도 산출

### ⚠️ 제한사항

1. **업데이트 주기**: 월 1회 업데이트 (실시간성 부족)
2. **데이터 지연**: 최신 데이터가 1개월 지연될 수 있음
3. **버스 중심**: 지하철, 도보 이용자는 반영되지 않음
4. **복잡한 데이터**: 100+ 필드로 데이터 처리 복잡

## 결론: **적절함** ⭐⭐⭐⭐☆

버스 승객수 데이터는 지역별 교통 혼잡도를 간접적으로 측정하는 **매우 유용한 지표**입니다. 기존 생활인구 데이터와 결합하면 더 정확한 혼잡도 산출이 가능합니다.

---

## 작업 계획

### Phase 1: API 연동 및 데이터 수집 (2시간)

#### 1.1 API 키 발급 및 테스트
- [ ] 교통빅데이터 포털에서 API 키 발급
- [ ] API 응답 구조 분석 및 테스트
- [ ] 필요한 필드 선별 (재차인원, 용량초과 관련)

#### 1.2 데이터 수집 Lambda 함수 생성
```javascript
// collectBusData.js
const REQUIRED_FIELDS = [
  'route_id', 'from_sta_id', 'to_sta_id', 'sta_sn',
  'a18', 'max_a18', 'a18_over_cnt',
  'a18Num08h', 'a18Num09h', 'a18Num17h', 'a18Num18h' // 출퇴근 시간
];
```

#### 1.3 DynamoDB 테이블 설계
```json
{
  "TableName": "BusTrafficData",
  "KeySchema": [
    {"AttributeName": "route_station_id", "KeyType": "HASH"},
    {"AttributeName": "date", "KeyType": "RANGE"}
  ],
  "Attributes": [
    {"AttributeName": "route_station_id", "AttributeType": "S"},
    {"AttributeName": "date", "AttributeType": "S"}
  ]
}
```

### Phase 2: 정류장-지역 매핑 시스템 (3시간)

#### 2.1 정류장 위치 데이터 수집
- [ ] 서울시 버스정류장 위치 API 연동
- [ ] 정류장 ID → 좌표 매핑 테이블 생성
- [ ] 좌표 → 행정동 매핑 로직 구현

#### 2.2 지역별 교통량 집계
```javascript
// 정류장별 데이터를 행정동별로 집계
const aggregateByDistrict = (busData) => {
  return busData.reduce((acc, station) => {
    const district = getDistrictFromCoords(station.lat, station.lng);
    if (!acc[district]) acc[district] = { totalPassengers: 0, overCapacity: 0 };
    acc[district].totalPassengers += station.avgPassengers;
    acc[district].overCapacity += station.overCapacityCount;
    return acc;
  }, {});
};
```

### Phase 3: 혼잡도 알고리즘 개선 (2시간)

#### 3.1 복합 혼잡도 지수 개발
```javascript
const calculateEnhancedCrowdLevel = (populationData, busData) => {
  const populationScore = normalizePopulation(populationData.population);
  const busScore = normalizeBusTraffic(busData.totalPassengers, busData.overCapacity);
  
  // 가중 평균 (생활인구 70%, 교통량 30%)
  const compositeScore = (populationScore * 0.7) + (busScore * 0.3);
  
  return {
    level: getLevel(compositeScore),
    confidence: calculateConfidence(populationData, busData),
    components: { population: populationScore, traffic: busScore }
  };
};
```

#### 3.2 시간대별 동적 가중치
```javascript
const getTimeBasedWeights = (hour) => {
  // 출퇴근 시간대는 교통량 가중치 증가
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    return { population: 0.5, traffic: 0.5 };
  }
  return { population: 0.7, traffic: 0.3 };
};
```

### Phase 4: API 통합 및 배포 (1시간)

#### 4.1 기존 API 수정
- [ ] populationAPI.js에 버스 데이터 통합 로직 추가
- [ ] 응답 스키마에 신뢰도 및 상세 정보 추가
- [ ] 에러 처리 및 폴백 로직 구현

#### 4.2 EventBridge 스케줄러 추가
- [ ] 버스 데이터 수집용 스케줄러 생성 (주 1회)
- [ ] 기존 생활인구 수집과 연동

## 예상 결과

### 개선된 API 응답 예시
```json
{
  "id": "enhanced_1",
  "name": "강남구 역삼동",
  "lat": 37.5009,
  "lng": 127.0364,
  "population": 8500,
  "crowdLevel": 2,
  "noiseLevel": 2,
  "enhancedCrowdLevel": {
    "level": 1,
    "confidence": 0.85,
    "components": {
      "population": 0.7,
      "traffic": 0.4
    },
    "explanation": "생활인구는 높지만 교통량이 적어 실제 혼잡도는 보통"
  },
  "trafficData": {
    "avgPassengers": 45.2,
    "overCapacityRate": 0.12,
    "peakHourTraffic": 78.5
  }
}
```

### 정확도 향상 예상치
- **현재**: 생활인구만으로 혼잡도 추정 (정확도 ~60%)
- **개선 후**: 생활인구 + 교통량 복합 지수 (정확도 ~80%)

## 기술적 고려사항

### 데이터 처리 최적화
1. **배치 처리**: 대용량 버스 데이터를 효율적으로 처리
2. **캐싱 전략**: 정류장-지역 매핑 데이터 캐싱
3. **데이터 압축**: 불필요한 필드 제거로 저장 공간 최적화

### 성능 영향 분석
- **추가 DynamoDB 테이블**: 월 ~$5 예상 비용
- **Lambda 실행 시간**: 기존 0.7초 → 1.2초 예상
- **데이터 신선도**: 버스 데이터는 주 1회 업데이트

### 에러 처리 전략
```javascript
const getEnhancedCrowdData = async (placeId) => {
  try {
    const [populationData, busData] = await Promise.allSettled([
      getPopulationData(placeId),
      getBusTrafficData(placeId)
    ]);
    
    if (populationData.status === 'fulfilled' && busData.status === 'fulfilled') {
      return calculateEnhancedCrowdLevel(populationData.value, busData.value);
    } else if (populationData.status === 'fulfilled') {
      return calculateBasicCrowdLevel(populationData.value);
    } else {
      throw new Error('No data available');
    }
  } catch (error) {
    return getFallbackData(placeId);
  }
};
```

## 위험 요소 및 대응 방안

### 1. 데이터 지연 문제
- **위험**: 버스 데이터가 1개월 지연될 수 있음
- **대응**: 계절성 패턴 학습으로 현재 시점 추정

### 2. API 호출 한도
- **위험**: 교통 API 호출 제한
- **대응**: 배치 처리 및 캐싱으로 호출 최소화

### 3. 복잡도 증가
- **위험**: 시스템 복잡도 증가로 유지보수 어려움
- **대응**: 단계적 구현 및 충분한 테스트

## 성공 지표

1. **정확도 향상**: 사용자 피드백 기반 혼잡도 정확도 20% 향상
2. **응답 시간**: 1.5초 이내 유지
3. **데이터 커버리지**: 서울시 주요 교통 거점 90% 커버
4. **시스템 안정성**: 99.5% 가용성 유지

## 결론 및 권장사항

### 권장사항: **진행 추천** ✅

1. **단계적 구현**: Phase 1부터 순차적으로 진행
2. **MVP 접근**: 핵심 기능부터 구현 후 점진적 개선
3. **A/B 테스트**: 기존 방식과 개선된 방식 병행 운영
4. **사용자 피드백**: 실제 사용자 경험 기반 알고리즘 튜닝

### 예상 일정
- **총 소요 시간**: 8시간
- **완료 예정**: 1일 내 완료 가능
- **테스트 기간**: 1주일 A/B 테스트 권장

이 계획을 통해 쉿플레이스의 혼잡도 예측 정확도를 크게 향상시킬 수 있을 것으로 예상됩니다.
