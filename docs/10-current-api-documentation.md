# Population API 상세 동작 문서

## API 개요
- **엔드포인트**: `https://48hywqoyra.execute-api.us-east-1.amazonaws.com/dev/population`
- **메서드**: GET
- **목적**: 서울시 실시간 생활인구 데이터 조회 및 조용한 장소 추천

## 동작 흐름

### 1. API 호출 시 실행 순서

```
1. API Gateway 요청 수신
   ↓
2. Lambda 함수 (populationAPI) 실행
   ↓
3. 서울 열린데이터 API 실시간 호출 ⭐
   ↓
4. 데이터 파싱 및 매핑
   ↓
5. 지리적 필터링 (선택적)
   ↓
6. 조용한 곳 우선 정렬
   ↓
7. JSON 응답 반환
```

### 2. 서울시 API 호출 방식

**⚠️ 중요: 매 API 호출마다 서울시 API를 실시간으로 호출합니다**

```javascript
// 매번 실행되는 코드
const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/SPOP_LOCAL_RESD_DONG/1/100/`;
const response = await axios.get(url, { timeout: 15000 });
```

**호출 정보:**
- **API**: 서울 열린데이터광장 생활인구 API
- **엔드포인트**: `SPOP_LOCAL_RESD_DONG`
- **데이터 범위**: 1~100번째 레코드 (서울시 전체 행정동)
- **타임아웃**: 15초
- **API 키**: `475268626864726934334652674c4a`

### 3. 데이터 처리 과정

#### 3.1 원본 데이터 구조
```json
{
  "SPOP_LOCAL_RESD_DONG": {
    "list_total_count": 926016,
    "RESULT": {
      "CODE": "INFO-000",
      "MESSAGE": "정상 처리되었습니다"
    },
    "row": [
      {
        "STDR_DE_ID": "20250831",
        "TMZON_PD_SE": "00",
        "ADSTRD_CODE_SE": "11110515",
        "TOT_LVPOP_CO": "14071.5563",
        "MALE_F0T9_LVPOP_CO": "540.9512",
        // ... 연령대별 인구 데이터
      }
    ]
  }
}
```

#### 3.2 데이터 매핑 과정
1. **행정동 코드 매핑**: `ADSTRD_CODE_SE` → 지역명 + 좌표
2. **인구수 추출**: `TOT_LVPOP_CO` → 총 생활인구수
3. **소음/혼잡도 계산**: 인구수 기반 0~2 레벨 산출
4. **추천 메시지 생성**: 인구수에 따른 산책 추천도

#### 3.3 최종 응답 구조
```json
[
  {
    "id": "seoul_real_1",
    "name": "청운효자동",
    "lat": 37.5816,
    "lng": 126.9685,
    "population": 14071,
    "noiseLevel": 2,
    "crowdLevel": 2,
    "category": "실시간 데이터",
    "type": "real_data",
    "lastUpdated": "2025-09-05T06:37:41.051Z",
    "walkingRecommendation": "사람 많은 번화가",
    "dataSource": "서울 열린데이터광장",
    "areaCode": "11110515",
    "updateTime": "20250831",
    "distance": 1250
  }
]
```

### 4. 쿼리 파라미터

| 파라미터 | 타입 | 기본값 | 설명 | 예시 |
|----------|------|--------|------|------|
| `lat` | float | - | 중심 위도 | `37.5665` |
| `lng` | float | - | 중심 경도 | `126.9780` |
| `radius` | int | 1000 | 반경 (미터) | `2000` |
| `limit` | int | 20 | 결과 개수 제한 | `50` |

### 5. 지리적 필터링 로직

```javascript
if (queryParams.lat && queryParams.lng) {
  const centerLat = parseFloat(queryParams.lat);
  const centerLng = parseFloat(queryParams.lng);
  const radius = parseInt(queryParams.radius) || 1000;
  
  places = places.filter(place => {
    const distance = calculateDistance(centerLat, centerLng, place.lat, place.lng);
    place.distance = Math.round(distance);
    return distance <= radius;
  });
}
```

**거리 계산**: Haversine 공식 사용 (지구 곡률 고려)

### 6. 정렬 알고리즘

```javascript
// 조용한 곳 우선 정렬
places.sort((a, b) => {
  const scoreA = a.crowdLevel * 0.6 + a.noiseLevel * 0.4;
  const scoreB = b.crowdLevel * 0.6 + b.noiseLevel * 0.4;
  return scoreA - scoreB;
});
```

**정렬 기준**: 혼잡도 60% + 소음도 40% 가중치

### 7. 오류 처리 및 폴백

#### 7.1 서울 API 실패 시
```javascript
try {
  places = await fetchRealSeoulData();
} catch (error) {
  console.log('Seoul API failed, using mock data:', error.message);
  places = generateMockData();
}
```

#### 7.2 Mock 데이터 구조
- 강남구 5개 지역 (역삼동, 논현동, 압구정동, 청담동, 삼성동)
- 시간대별 인구 변화 시뮬레이션
- 지역 특성별 기본 인구수 설정

### 8. 성능 특성

#### 8.1 응답 시간
- **정상**: 2-5초 (서울 API 응답 시간 포함)
- **서울 API 실패**: 100-200ms (Mock 데이터)
- **타임아웃**: 15초

#### 8.2 데이터 신선도
- **실시간**: 서울시에서 제공하는 최신 데이터
- **캐싱 없음**: 매 호출마다 최신 데이터 조회
- **업데이트 주기**: 서울시 API 업데이트 주기에 따름

### 9. 제한사항

1. **서울시 데이터만 제공**: 다른 지역 데이터 없음
2. **최대 100개 지역**: 서울시 행정동 기준
3. **외부 API 의존성**: 서울 열린데이터 API 장애 시 Mock 데이터 사용
4. **캐싱 없음**: 매번 실시간 호출로 인한 지연 가능성

### 10. 사용 예시

#### 10.1 전체 데이터 조회
```bash
curl "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/dev/population"
```

#### 10.2 특정 지역 주변 조회
```bash
curl "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/dev/population?lat=37.5665&lng=126.9780&radius=2000&limit=10"
```

#### 10.3 JavaScript 사용
```javascript
const response = await fetch('https://48hywqoyra.execute-api.us-east-1.amazonaws.com/dev/population?limit=50');
const places = await response.json();

// 가장 조용한 곳 찾기
const quietestPlace = places[0];
console.log(`추천 장소: ${quietestPlace.name} (인구: ${quietestPlace.population}명)`);
```

### 11. 모니터링 및 로깅

#### 11.1 CloudWatch 로그
- 서울 API 호출 상태
- 응답 데이터 구조 로깅
- 오류 발생 시 상세 로그

#### 11.2 주요 로그 메시지
```
- "Calling Seoul API: [URL]"
- "Received X records from Seoul API"
- "Seoul API failed, using mock data: [error]"
- "Using real Seoul API data: X places"
```

## 결론

현재 API는 **매 호출마다 서울시 API를 실시간으로 호출**하여 최신 데이터를 제공합니다. 이는 데이터 신선도를 보장하지만, 응답 시간이 외부 API에 의존적이라는 특성이 있습니다. 서울 API 장애 시에는 자동으로 Mock 데이터로 폴백하여 서비스 연속성을 보장합니다.
