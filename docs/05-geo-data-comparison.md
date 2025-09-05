# DynamoDB vs Timestream 지리적 데이터 처리 비교

## 🗺️ 지리적 데이터 처리 능력 분석

### DynamoDB 지리적 데이터 처리

#### 장점
- **GeoHash 지원**: 위경도를 문자열로 변환하여 인덱싱
- **범위 쿼리**: GSI를 통한 지역별 검색 최적화
- **빠른 조회**: 단일 자릿수 밀리초 응답시간

#### 구현 예시
```javascript
// DynamoDB 지리적 쿼리
const geohash = require('ngeohash');

// 데이터 저장시
const item = {
  placeId: 'place_001',
  geohash: geohash.encode(37.5665, 126.9780, 7), // "wydm6"
  latitude: 37.5665,
  longitude: 126.9780,
  population: 1500,
  timestamp: '2025-09-05T14:29:00Z'
};

// 주변 검색 쿼리
const centerHash = geohash.encode(37.5665, 126.9780, 7);
const neighbors = geohash.neighbors(centerHash);

const params = {
  TableName: 'Places',
  IndexName: 'GeohashIndex',
  KeyConditionExpression: 'geohash = :hash',
  ExpressionAttributeValues: {
    ':hash': centerHash
  }
};
```

### Timestream 지리적 데이터 처리

#### 제한사항
- **네이티브 지리적 함수 없음**: ST_Distance, ST_Within 등 미지원
- **복잡한 범위 쿼리**: 위경도 범위로만 필터링 가능
- **인덱싱 제한**: 지리적 인덱스 없음

#### 구현 예시
```sql
-- Timestream 지리적 쿼리 (제한적)
SELECT 
  place_id,
  latitude,
  longitude,
  measure_value::double as population,
  time
FROM "ShitPlaceDB"."PopulationData"
WHERE time >= ago(15m)
  AND latitude BETWEEN 37.5565 AND 37.5765  -- 수동 범위 계산 필요
  AND longitude BETWEEN 126.9680 AND 126.9880
ORDER BY time DESC
```

## 🔍 프론트엔드 지리적 데이터 사용성 비교

### DynamoDB 기반 프론트엔드 연동

```javascript
// 지도 중심점 기준 주변 장소 검색
const searchNearbyPlaces = async (lat, lng, radius = 1000) => {
  const response = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
  const data = await response.json();
  
  // 지도에 마커 표시
  data.places.forEach(place => {
    addMarkerToMap({
      lat: place.latitude,
      lng: place.longitude,
      population: place.currentPopulation,
      crowdLevel: place.crowdLevel
    });
  });
};

// 실시간 업데이트 (WebSocket)
const subscribeToUpdates = (bounds) => {
  const ws = new WebSocket('/ws/population-updates');
  ws.send(JSON.stringify({
    type: 'subscribe',
    bounds: bounds // 지도 영역
  }));
};
```

### Timestream 기반 프론트엔드 연동 (제한적)

```javascript
// 시계열 데이터 조회 (지리적 필터링 제한)
const getPopulationTrend = async (placeId) => {
  const response = await fetch(`/api/population/trend/${placeId}`);
  const data = await response.json();
  
  // 차트 표시 (시간축)
  renderTimeSeriesChart(data.trends);
};

// 지역별 데이터는 별도 처리 필요
const getRegionalData = async (region) => {
  // 미리 정의된 지역 코드로만 조회 가능
  const response = await fetch(`/api/population/region/${region}`);
  return response.json();
};
```

## 📊 성능 및 비용 비교

| 항목 | DynamoDB | Timestream |
|------|----------|------------|
| 지리적 쿼리 | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 실시간 조회 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 시계열 분석 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 비용 (소규모) | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 설정 복잡도 | ⭐⭐⭐ | ⭐⭐⭐⭐ |

## 🎯 권장 아키텍처

### 하이브리드 접근법
```javascript
// 1. DynamoDB: 현재 상태 + 지리적 검색
const getCurrentPlaces = async (lat, lng, radius) => {
  // DynamoDB에서 지리적 검색
  return await dynamoGeoQuery(lat, lng, radius);
};

// 2. Timestream: 시계열 트렌드 분석
const getPopulationTrend = async (placeId, timeRange) => {
  // Timestream에서 시계열 데이터
  return await timestreamQuery(placeId, timeRange);
};

// 3. 프론트엔드에서 결합
const PlaceDetail = ({ placeId, lat, lng }) => {
  const [currentData] = useState(() => getCurrentPlaces(lat, lng, 500));
  const [trendData] = useState(() => getPopulationTrend(placeId, '24h'));
  
  return (
    <div>
      <Map places={currentData} />
      <TrendChart data={trendData} />
    </div>
  );
};
```

## 🚨 결론 및 권장사항

### Timestream 단독 사용시 문제점
1. **지리적 검색 불가**: "내 주변 조용한 곳" 검색 어려움
2. **복잡한 쿼리**: 수동으로 위경도 범위 계산 필요
3. **프론트엔드 복잡성**: 지도 연동시 추가 로직 필요

### 권장 솔루션
**DynamoDB 메인 + Timestream 보조**
- DynamoDB: 현재 상태, 지리적 검색, 실시간 조회
- Timestream: 장기 트렌드, 시계열 분석, 예측 모델

### 즉시 구현 가능한 최소 구성
```javascript
// DynamoDB만으로 시작 (TTL 7일 설정)
const schema = {
  PK: 'place_id',
  SK: 'timestamp',
  geohash: 'GSI1PK',  // 지리적 검색용
  population: 'number',
  latitude: 'number',
  longitude: 'number',
  ttl: 'number'  // 7일 후 자동 삭제
};
```

**결론**: 프론트엔드에서 지도 기반 서비스를 구현하려면 DynamoDB가 필수적입니다. Timestream은 나중에 고급 분석용으로 추가하는 것을 권장합니다.
