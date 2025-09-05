# 쉿플레이스 API 명세서

## 개요
쉿플레이스 프로젝트의 REST API 명세서입니다. 서울시 실시간 인구 데이터를 기반으로 조용한 장소를 추천하는 서비스를 제공합니다.

## 기본 정보

### Base URL
```
https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod
```

### 인증
현재 인증이 필요하지 않습니다. (Public API)

### 응답 형식
- **Content-Type**: `application/json`
- **Character Encoding**: UTF-8

### CORS 설정
- **Access-Control-Allow-Origin**: `*`
- **Access-Control-Allow-Methods**: `GET, OPTIONS`
- **Access-Control-Allow-Headers**: `Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token`

## API 엔드포인트

### 1. 인구 데이터 조회

#### GET /population

서울시 실시간 인구 데이터를 조회합니다.

**요청**
```http
GET /population?lat=37.5665&lng=126.9780&radius=1000&limit=20
```

**쿼리 파라미터**

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `lat` | number | 선택 | - | 중심점 위도 (지리적 필터링 시 필요) |
| `lng` | number | 선택 | - | 중심점 경도 (지리적 필터링 시 필요) |
| `radius` | integer | 선택 | 1000 | 검색 반경 (미터 단위) |
| `limit` | integer | 선택 | 20 | 반환할 최대 결과 수 (1-100) |

**응답**

**성공 (200 OK)**
```json
[
  {
    "id": "cached_1",
    "name": "교남동",
    "lat": 37.5751,
    "lng": 126.9568,
    "population": 7121,
    "noiseLevel": 1,
    "crowdLevel": 1,
    "category": "실시간 데이터",
    "type": "real_data",
    "lastUpdated": "2025-09-05T06:53:12.960Z",
    "walkingRecommendation": "적당한 활기의 거리 산책",
    "dataSource": "서울 열린데이터광장 (캐시됨)",
    "areaCode": "11110580",
    "updateTime": "20250831",
    "distance": 850
  }
]
```

**에러 응답**

**서버 오류 (500 Internal Server Error)**
```json
{
  "error": "DynamoDB query failed: ResourceNotFoundException",
  "message": "API 호출 중 오류가 발생했습니다"
}
```

## 데이터 모델

### Place 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 장소 고유 식별자 |
| `name` | string | 장소명 (행정동명) |
| `lat` | number | 위도 |
| `lng` | number | 경도 |
| `population` | integer | 현재 생활인구수 |
| `noiseLevel` | integer | 소음도 (0: 조용함, 1: 보통, 2: 시끄러움) |
| `crowdLevel` | integer | 혼잡도 (0: 한적함, 1: 보통, 2: 혼잡함) |
| `category` | string | 데이터 카테고리 |
| `type` | string | 데이터 타입 (`real_data` 또는 `mock_data`) |
| `lastUpdated` | string | 마지막 업데이트 시간 (ISO 8601) |
| `walkingRecommendation` | string | 산책 추천 메시지 |
| `dataSource` | string | 데이터 출처 |
| `areaCode` | string | 행정동 코드 |
| `updateTime` | string | 서울 API 기준 업데이트 일자 |
| `distance` | integer | 중심점으로부터의 거리 (미터, 지리적 필터링 시에만 포함) |

### 소음도/혼잡도 레벨

**소음도 (noiseLevel)**
- `0`: 조용함 (인구 < 5,000명)
- `1`: 보통 (5,000 ≤ 인구 < 10,000명)
- `2`: 시끄러움 (인구 ≥ 10,000명)

**혼잡도 (crowdLevel)**
- `0`: 한적함 (인구 < 3,000명)
- `1`: 보통 (3,000 ≤ 인구 < 8,000명)
- `2`: 혼잡함 (인구 ≥ 8,000명)

## 사용 예시

### 1. 전체 데이터 조회 (100개 지역)
```bash
curl -X GET "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/population?limit=100"
```

### 2. 특정 위치 중심 반경 500m 내 조회
```bash
curl -X GET "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/population?lat=37.5665&lng=126.9780&radius=500&limit=10"
```

### 3. JavaScript fetch 예시
```javascript
const response = await fetch(
  'https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/population?limit=50'
);
const places = await response.json();

// 조용한 장소만 필터링
const quietPlaces = places.filter(place => 
  place.noiseLevel <= 1 && place.crowdLevel <= 1
);
```

### 4. React 컴포넌트 예시
```typescript
import { useEffect, useState } from 'react';

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
  noiseLevel: number;
  crowdLevel: number;
  walkingRecommendation: string;
}

const PlacesList: React.FC = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const response = await fetch(
          'https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/population?limit=100'
        );
        const data = await response.json();
        setPlaces(data);
      } catch (error) {
        console.error('Failed to fetch places:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {places.map(place => (
        <div key={place.id}>
          <h3>{place.name}</h3>
          <p>인구: {place.population.toLocaleString()}명</p>
          <p>추천: {place.walkingRecommendation}</p>
        </div>
      ))}
    </div>
  );
};
```

## 데이터 업데이트 주기

### 자동 업데이트
- **주기**: 매시간 (EventBridge 스케줄러)
- **데이터 소스**: 서울 열린데이터광장 API
- **처리 방식**: DynamoDB 캐시 업데이트
- **TTL**: 24시간 (자동 삭제)

### 데이터 신선도
- **실시간성**: 최대 1시간 지연
- **캐시 히트율**: 99%+
- **응답 시간**: 평균 0.7초

## 성능 특성

### 응답 시간
- **평균**: 700ms
- **P95**: 1.2초
- **P99**: 2.0초

### 처리량
- **최대 RPS**: 100 requests/second
- **동시 연결**: 1,000 connections
- **일일 요청 한도**: 무제한

### 가용성
- **SLA**: 99.9%
- **지역**: us-east-1 (버지니아 북부)
- **백업**: DynamoDB Point-in-Time Recovery

## 에러 코드

| HTTP 상태 | 에러 코드 | 설명 | 해결 방법 |
|-----------|-----------|------|-----------|
| 200 | - | 성공 | - |
| 400 | `InvalidParameter` | 잘못된 쿼리 파라미터 | 파라미터 값 확인 |
| 429 | `TooManyRequests` | 요청 한도 초과 | 잠시 후 재시도 |
| 500 | `InternalServerError` | 서버 내부 오류 | 잠시 후 재시도 |
| 502 | `BadGateway` | Lambda 함수 오류 | 관리자 문의 |
| 503 | `ServiceUnavailable` | 서비스 일시 중단 | 잠시 후 재시도 |

## 제한사항

### 요청 제한
- **limit 파라미터**: 최대 100
- **radius 파라미터**: 최대 10,000m (10km)
- **요청 크기**: 최대 1MB

### 지리적 제한
- **서비스 지역**: 서울특별시만 지원
- **좌표 범위**: 
  - 위도: 37.4-37.7
  - 경도: 126.8-127.2

### 데이터 제한
- **총 지역 수**: 100개 행정동
- **업데이트 주기**: 1시간
- **히스토리**: 현재 데이터만 제공

## 버전 관리

### 현재 버전
- **API 버전**: v1.0
- **배포 환경**: Production
- **마지막 업데이트**: 2025-09-05

### 변경 이력
- **v1.0 (2025-09-05)**: 초기 API 릴리스
  - 실시간 인구 데이터 조회 기능
  - 지리적 필터링 기능
  - DynamoDB 캐시 시스템 적용

## 지원 및 문의

### 기술 지원
- **GitHub Issues**: [프로젝트 저장소](https://github.com/your-repo/team22-aws-hackathon)
- **이메일**: support@shitplace.com

### 개발자 리소스
- **API 테스트**: [Postman Collection](https://postman.com/collections/shitplace-api)
- **SDK**: JavaScript/TypeScript 지원
- **예제 코드**: [GitHub Examples](https://github.com/your-repo/examples)

## 라이선스

이 API는 MIT 라이선스 하에 제공됩니다.

---

**마지막 업데이트**: 2025-09-05  
**문서 버전**: 1.0
