# 인구밀집도 실시간 API 구축 작업 계획

## 🎯 목표
서울 실시간 인구밀집도 데이터를 DynamoDB에 저장하고 프론트엔드에서 지리적 검색이 가능한 API 구축

## 📋 작업 체크리스트

### Phase 1: DynamoDB 테이블 생성
- [ ] **1-1. PlacesCurrent 테이블 생성**
  - PK: place_id (String)
  - SK: "CURRENT" (String)  
  - GSI: geohash-index (geohash, lastUpdated)
  - TTL: 1시간 설정

- [ ] **1-2. PlacesHistory 테이블 생성**
  - PK: place_id (String)
  - SK: timestamp (String)
  - TTL: 7일 설정

- [ ] **1-3. 테이블 생성 확인**
  - AWS 콘솔에서 테이블 상태 Active 확인
  - 인덱스 생성 완료 확인

### Phase 2: 데이터 수집 Lambda 함수 개발
- [ ] **2-1. populationCollector Lambda 함수 생성**
  - 기존 dataCollector.js 기반으로 수정
  - GeoHash 라이브러리 추가 (ngeohash)
  - DynamoDB 클라이언트 설정

- [ ] **2-2. 서울 API 연동 로직 구현**
  - SPOP_LOCAL_RESD_DONG API 호출
  - 데이터 파싱 및 검증
  - 에러 핸들링 추가

- [ ] **2-3. DynamoDB 저장 로직 구현**
  - GeoHash 계산 (정밀도 7)
  - Current/History 테이블 동시 저장
  - 배치 처리 최적화

- [ ] **2-4. Lambda 함수 배포**
  - ZIP 패키징 및 업로드
  - 환경변수 설정 (SEOUL_API_KEY)
  - IAM 역할 권한 설정

- [ ] **2-5. 데이터 수집 테스트**
  - 수동 실행으로 데이터 저장 확인
  - DynamoDB 테이블에 데이터 입력 검증
  - CloudWatch 로그 확인

### Phase 3: 조회 API Lambda 함수 개발
- [ ] **3-1. populationAPI Lambda 함수 생성**
  - 지리적 검색 로직 구현
  - 쿼리 파라미터 처리 (lat, lng, radius)
  - 응답 데이터 포맷 정의

- [ ] **3-2. GeoHash 기반 검색 구현**
  - 중심점 GeoHash 계산
  - 주변 GeoHash 영역 계산
  - DynamoDB 병렬 쿼리 실행

- [ ] **3-3. API 응답 최적화**
  - 거리 계산 및 정렬
  - 페이징 처리
  - 캐싱 헤더 설정

- [ ] **3-4. Lambda 함수 배포 및 테스트**
  - 함수 배포 완료
  - 다양한 쿼리 파라미터로 테스트
  - 응답 시간 및 정확성 검증

### Phase 4: API Gateway 연동
- [ ] **4-1. API Gateway 리소스 추가**
  - 기존 test-api에 /population 리소스 생성
  - /population/nearby 서브 리소스 생성
  - OPTIONS 메서드 추가 (CORS)

- [ ] **4-2. Lambda 프록시 통합 설정**
  - GET /population/nearby 메서드 생성
  - populationAPI Lambda와 연동
  - 쿼리 파라미터 전달 설정

- [ ] **4-3. CORS 설정**
  - Access-Control-Allow-Origin 설정
  - Access-Control-Allow-Methods 설정
  - Preflight 요청 처리

- [ ] **4-4. API 배포**
  - dev 스테이지 배포
  - 엔드포인트 URL 확인
  - API 문서 업데이트

### Phase 5: EventBridge 스케줄링
- [ ] **5-1. EventBridge 규칙 생성**
  - 10분 간격 스케줄 설정
  - populationCollector Lambda 타겟 설정
  - 규칙 활성화

- [ ] **5-2. 자동 수집 테스트**
  - 10분 대기 후 데이터 수집 확인
  - 연속 수집 동작 검증
  - 에러 발생시 알람 설정

### Phase 6: 통합 테스트 및 검증
- [ ] **6-1. 엔드포인트 기능 테스트**
  ```bash
  # 전체 데이터 조회
  curl "https://API_ID.execute-api.us-east-1.amazonaws.com/dev/population/nearby"
  
  # 지역별 조회
  curl "https://API_ID.execute-api.us-east-1.amazonaws.com/dev/population/nearby?lat=37.5665&lng=126.9780&radius=1000"
  ```

- [ ] **6-2. 응답 데이터 검증**
  - JSON 형식 확인
  - 필수 필드 존재 확인 (id, name, latitude, longitude, population, crowdLevel)
  - 거리 계산 정확성 확인

- [ ] **6-3. 성능 테스트**
  - 응답 시간 < 2초 확인
  - 동시 요청 처리 확인
  - 메모리 사용량 모니터링

- [ ] **6-4. 프론트엔드 연동 준비**
  - API 문서 작성
  - 샘플 요청/응답 예시 제공
  - CORS 동작 확인

## 🔧 기술 스펙

### DynamoDB 스키마
```javascript
// PlacesCurrent 테이블
{
  place_id: "gangnam_station",      // PK
  current: "CURRENT",               // SK
  geohash: "wydm6k",               // GSI1PK
  name: "강남역",
  latitude: 37.4979,
  longitude: 127.0276,
  population: 2500,
  crowdLevel: "high",
  lastUpdated: "2025-09-05T14:30:00Z",  // GSI1SK
  ttl: 1725544200
}
```

### API 엔드포인트
```
GET /population/nearby
Query Parameters:
- lat: 위도 (required)
- lng: 경도 (required) 
- radius: 반경(미터, default: 1000)
- limit: 결과 개수 (default: 20)

Response:
{
  "places": [
    {
      "id": "gangnam_station",
      "name": "강남역",
      "latitude": 37.4979,
      "longitude": 127.0276,
      "population": 2500,
      "crowdLevel": "high",
      "distance": 150,
      "lastUpdated": "2025-09-05T14:30:00Z"
    }
  ],
  "total": 15,
  "center": { "lat": 37.5665, "lng": 126.9780 },
  "radius": 1000
}
```

## ⏱️ 예상 소요시간
- **Phase 1**: 15분 (테이블 생성)
- **Phase 2**: 45분 (데이터 수집 Lambda)
- **Phase 3**: 45분 (조회 API Lambda)
- **Phase 4**: 30분 (API Gateway 연동)
- **Phase 5**: 15분 (스케줄링)
- **Phase 6**: 30분 (테스트)

**총 소요시간: 3시간**

## 🚨 주의사항
- 서울 API 키 필요 (환경변수 설정)
- DynamoDB 테이블명 일관성 유지
- GeoHash 정밀도 7로 고정 (약 153m x 153m)
- TTL 설정으로 자동 데이터 정리
- 에러 발생시 CloudWatch 로그 확인

---

**승인 요청**: 위 작업 계획으로 진행해도 될까요? 수정이 필요한 부분이 있다면 알려주세요.
