# 서울 실시간 데이터 활용 전략

## 🎯 핵심 활용 데이터

### 1. 실시간 생활인구 (SPOP_LOCAL_RESD_DONG)
- **목적**: 지역별 혼잡도 측정
- **수집 주기**: 10분마다
- **활용**: 인구밀도 → 혼잡도 레벨 변환

### 2. 교통정보 (TrafficInfo)
- **목적**: 소음도 추정
- **지표**: 평균속도 (낮을수록 정체 = 높은 소음)
- **활용**: 교통량 → 소음도 레벨 변환

### 3. 지하철 승하차 (CARD_SUBWAY_STTS)
- **목적**: 역 주변 혼잡도
- **활용**: 승하차 인원 → 역세권 혼잡도

## 🔄 데이터 수집 플로우

```
EventBridge (10분마다) 
→ Lambda (dataCollector) 
→ 서울 API 호출 
→ 데이터 가공 
→ DynamoDB 저장
```

## 📊 데이터 가공 로직

### 혼잡도 계산
```javascript
function calculateCrowdLevel(population) {
  if (population < 1000) return 'low';    // 조용함 🟢
  if (population < 5000) return 'medium'; // 보통 🟡  
  return 'high';                          // 혼잡 🔴
}
```

### 소음도 추정
```javascript
function calculateNoiseLevel(avgSpeed) {
  if (avgSpeed > 40) return 'low';    // 원활 = 조용함
  if (avgSpeed > 20) return 'medium'; // 서행 = 보통
  return 'high';                      // 정체 = 시끄러움
}
```

## 🎯 추천 장소 알고리즘

1. **조용한 곳 우선순위**:
   - 혼잡도: low > medium > high
   - 소음도: low > medium > high
   - 가중치: 혼잡도 60%, 소음도 40%

2. **시간대별 패턴 학습**:
   - 출퇴근 시간 vs 평상시
   - 요일별 패턴
   - 날씨별 영향

## 🚀 구현 단계

1. **1단계**: 기본 데이터 수집 (인구, 교통)
2. **2단계**: 지하철/버스 데이터 추가
3. **3단계**: 공원/문화시설 현황 연동
4. **4단계**: ML 기반 예측 모델

## 📈 성능 최적화

- **캐싱**: Redis로 최근 데이터 캐시
- **배치 처리**: 여러 API 동시 호출
- **데이터 압축**: 불필요한 필드 제거
- **인덱싱**: 지역별, 시간별 쿼리 최적화
