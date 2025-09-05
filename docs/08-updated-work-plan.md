# 인구밀집도 실시간 API 구축 작업 계획 (업데이트)

## 🔍 기존 구조 분석 결과
- **프론트엔드**: `/frontend/src/services/seoulApi.js`에 서울 API 연동 로직 존재
- **환경변수**: `.env.example`에 `SEOUL_API_KEY` 설정 확인
- **API 구조**: 이미 `/api/seoul/population` 엔드포인트 구조 설계됨
- **데이터 처리**: 지역별, 시간대별 인구 변동 로직 구현됨

## 📋 수정된 작업 체크리스트

### Phase 1: DynamoDB 테이블 생성
- [ ] **1-1. PlacesCurrent 테이블 생성**
- [ ] **1-2. PlacesHistory 테이블 생성** 
- [ ] **1-3. 테이블 생성 확인**

### Phase 2: 데이터 수집 Lambda 함수 개발
- [ ] **2-1. populationCollector Lambda 함수 생성**
  - 기존 `dataCollector.js` + 프론트엔드 `seoulApi.js` 로직 결합
  - 서울 API 엔드포인트: `SPOP_LOCAL_RESD_DONG` 사용
  - 지역별 타입 분류 로직 포함 (business, residential, shopping 등)

- [ ] **2-2. 서울 API 연동 로직 구현**
  - 기존 프론트엔드 로직 참조하여 Lambda에 적용
  - 시간대별 인구 변동 계산 로직 포함
  - 지역 타입별 임계값 설정

- [ ] **2-3. DynamoDB 저장 로직 구현**
- [ ] **2-4. Lambda 함수 배포**
- [ ] **2-5. 데이터 수집 테스트**

### Phase 3: 조회 API Lambda 함수 개발 ⭐ **수정됨**
- [ ] **3-1. populationAPI Lambda 함수 생성**
  - 기존 `/api/seoul/population` 엔드포인트 구조 활용
  - 프론트엔드 `fetchSeoulPopulationData()` 응답 형식 맞춤
  - 지역 타입별 필터링 지원

- [ ] **3-2. 기존 API 응답 형식 호환성 확보**
  ```javascript
  // 기존 프론트엔드 기대 형식
  {
    id: "seoul_1",
    name: "강남구 역삼동",
    lat: 37.5009,
    lng: 127.0364,
    population: 8500,
    noiseLevel: 1,      // 0: 낮음, 1: 보통, 2: 높음
    crowdLevel: 2,      // 0: 낮음, 1: 보통, 2: 높음
    category: "비즈니스 지구",
    type: "business",
    lastUpdated: "2025-09-05T14:30:00Z",
    walkingRecommendation: "적당한 활기의 거리 산책"
  }
  ```

- [ ] **3-3. 지역 타입별 로직 구현**
  - business, residential, shopping, luxury, education 등
  - 시간대별 인구 변동 패턴 적용
  - 지역별 소음/혼잡도 계산 로직

- [ ] **3-4. Lambda 함수 배포 및 테스트**

### Phase 4: API Gateway 연동 ⭐ **수정됨**
- [ ] **4-1. 기존 엔드포인트 구조 활용**
  - `/api/seoul/population` 엔드포인트 생성 (프론트엔드 호환)
  - 추가로 `/api/population/nearby` 지리적 검색 엔드포인트

- [ ] **4-2. Lambda 프록시 통합 설정**
- [ ] **4-3. CORS 설정**
- [ ] **4-4. API 배포**

### Phase 5: EventBridge 스케줄링
- [ ] **5-1. EventBridge 규칙 생성**
- [ ] **5-2. 자동 수집 테스트**

### Phase 6: 통합 테스트 및 검증 ⭐ **수정됨**
- [ ] **6-1. 기존 프론트엔드 호환성 테스트**
  ```bash
  # 기존 프론트엔드 API 호출
  curl "https://API_ID.execute-api.us-east-1.amazonaws.com/dev/api/seoul/population"
  
  # 새로운 지리적 검색 API
  curl "https://API_ID.execute-api.us-east-1.amazonaws.com/dev/api/population/nearby?lat=37.5665&lng=126.9780&radius=1000"
  ```

- [ ] **6-2. 프론트엔드 연동 테스트**
  - `fetchSeoulPopulationData()` 함수 정상 동작 확인
  - 지역별 정렬 및 필터링 확인
  - 시간대별 데이터 변화 확인

- [ ] **6-3. 성능 테스트**
- [ ] **6-4. 최종 검증**

## 🔧 기존 구조 활용 포인트

### 1. 서울 API 연동 로직 재사용
```javascript
// 기존 프론트엔드 로직을 Lambda에 적용
const seoulAreas = [
  { name: "강남구 역삼동", lat: 37.5009, lng: 127.0364, basePopulation: 8500, type: "business" },
  { name: "강남구 논현동", lat: 37.5048, lng: 127.0280, basePopulation: 4200, type: "residential" },
  // ... 기존 데이터 활용
];
```

### 2. 환경변수 설정
```bash
# Lambda 환경변수
SEOUL_API_KEY=실제_API_키
PLACES_CURRENT_TABLE=PlacesCurrent
PLACES_HISTORY_TABLE=PlacesHistory
```

### 3. API 엔드포인트 호환성
- 기존: `GET /api/seoul/population` (프론트엔드 호환)
- 신규: `GET /api/population/nearby` (지리적 검색)

## ⚠️ 주요 변경사항
1. **기존 API 구조 활용**: 프론트엔드 수정 최소화
2. **지역 타입 분류**: business, residential 등 기존 로직 활용
3. **시간대별 변동**: 기존 계산 로직 Lambda에 적용
4. **응답 형식 호환**: 기존 프론트엔드 코드와 100% 호환

---

**승인 요청**: 기존 구조를 최대한 활용한 수정된 계획으로 진행하시겠습니까?
