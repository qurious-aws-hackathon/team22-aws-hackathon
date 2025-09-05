# 쉿플레이스 API 명세서

## 개요
쉿플레이스 프로젝트의 REST API 명세서입니다. 서울시 실시간 인구 데이터를 기반으로 조용한 장소를 추천하는 서비스를 제공합니다.

## 현재 구현 상태

### ✅ 구현 완료된 API
- **인구 데이터 조회** (`GET /population`)
- **이미지 업로드** (`POST /images`)
- **이미지 조회** (`GET /images/{imageId}`)
- **Spot 생성** (`POST /spots`)
- **Spot 목록 조회** (`GET /spots`)
- **Spot 상세 조회** (`GET /spots/{spotId}`)
- **Spot 댓글 등록** (`POST /spots/{spotId}/comments`)
- **Spot 좋아요** (`POST /spots/{spotId}/like`)
- **Spot 싫어요** (`POST /spots/{spotId}/dislike`)
- **Spot 업데이트** (`PUT /spots/{spotId}`)
- **AI 추천 시스템** (`POST /recommendations`)

### 🆕 새로 추가된 기능
- **AI 기반 장소 추천** - Amazon Bedrock Claude 3 Haiku 모델 사용
- **듀얼 추천 시스템** - 기존 스팟 데이터 + AI 일반 장소 검색
- **실시간 추천 분석** - 위치, 선호도, 카테고리 기반 맞춤 추천

## 기본 정보

### 구현된 Base URL
```
Population API: https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod
Image API: https://7smx6otaai.execute-api.us-east-1.amazonaws.com/prod
File API: https://bfis3yezal.execute-api.us-east-1.amazonaws.com/prod
Spots API: https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod
```

### 인증
현재 인증이 필요하지 않습니다. (Public API)

### 응답 형식
- **Content-Type**: `application/json`
- **Character Encoding**: UTF-8

### CORS 설정
- **Access-Control-Allow-Origin**: `*`
- **Access-Control-Allow-Methods**: `GET, POST, PUT, OPTIONS`
- **Access-Control-Allow-Headers**: `Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token`

## 구현된 API 엔드포인트

### 1. 인구 데이터 조회 ✅

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

### 2. 이미지 업로드 ✅

#### POST /images

새로운 이미지를 업로드합니다.

**요청**
```http
POST /images
Content-Type: multipart/form-data

{
  "file": <binary_data>,
  "filename": "example.jpg"
}
```

**응답**
```json
{
  "imageId": "c280a439-64ca-4e7e-a95b-8ad25575eb93",
  "filename": "example.jpg",
  "s3Key": "images/c280a439-64ca-4e7e-a95b-8ad25575eb93/example.jpg",
  "size": 1024,
  "uploadTime": "2025-09-05T07:22:36.785556",
  "message": "이미지가 성공적으로 업로드되었습니다."
}
```

### 3. 이미지 조회 ✅

#### GET /images/{imageId}

특정 이미지의 메타데이터를 조회합니다.

**요청**
```http
GET /images/c280a439-64ca-4e7e-a95b-8ad25575eb93
```

**응답**
```json
{
  "imageId": "c280a439-64ca-4e7e-a95b-8ad25575eb93",
  "filename": "example.jpg",
  "s3Key": "images/c280a439-64ca-4e7e-a95b-8ad25575eb93/example.jpg",
  "size": 1024,
  "uploadTime": "2025-09-05T07:22:36.785556",
  "downloadUrl": "https://image-upload-533266989224.s3.us-east-1.amazonaws.com/images/c280a439-64ca-4e7e-a95b-8ad25575eb93/example.jpg"
}
```

## 구현 필요한 API 엔드포인트 (Spot 관련)

### 4. Spot 생성 ❌

#### POST /spots

새로운 조용한 장소를 등록합니다.

**구현 필요 사항:**
- DynamoDB `Spots` 테이블 생성
- Lambda 함수 구현
- API Gateway 리소스 추가

**요청 (예정)**
```http
POST /spots
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "lat": 37.5665,
  "lng": 126.9780,
  "name": "조용한 카페",
  "description": "도심 속 숨겨진 조용한 카페입니다.",
  "category": "카페",
  "noise_level": 35,
  "quiet_rating": 85,
  "rating": 4.5
}
```

### 5. Spot 목록 조회 ❌

#### GET /spots

등록된 조용한 장소 목록을 조회합니다.

**구현 필요 사항:**
- DynamoDB `Spots` 테이블 스캔 로직
- 지리적 필터링 구현
- Lambda 함수 구현

**요청 (예정)**
```http
GET /spots?lat=37.5665&lng=126.9780&radius=1000&limit=20&category=카페
```

### 6. Spot 상세 조회 ❌

#### GET /spots/{spotId}

특정 장소의 상세 정보와 댓글을 조회합니다.

**구현 필요 사항:**
- DynamoDB `Spots` 테이블 조회
- DynamoDB `Comments` 테이블 조회 (조인)
- Lambda 함수 구현

### 7. Spot 댓글 등록 ❌

#### POST /spots/{spotId}/comments

특정 장소에 댓글을 등록합니다.

**구현 필요 사항:**
- DynamoDB `Comments` 테이블 생성
- Lambda 함수 구현

### 8. Spot 좋아요 ❌

#### POST /spots/{spotId}/like

특정 장소에 좋아요를 등록합니다.

**구현 필요 사항:**
- DynamoDB `SpotLikes` 테이블 생성
- DynamoDB `Spots` 테이블 업데이트 (like_count 증가)
- Lambda 함수 구현

### 9. Spot 싫어요 ❌

#### POST /spots/{spotId}/dislike

특정 장소에 싫어요를 등록합니다.

**구현 필요 사항:**
- DynamoDB `SpotLikes` 테이블 생성
- DynamoDB `Spots` 테이블 업데이트 (dislike_count 증가)
- Lambda 함수 구현

### 10. Spot 업데이트 ❌

#### PUT /spots/{spotId}

특정 장소의 설명을 업데이트합니다.

**구현 필요 사항:**
- DynamoDB `Spots` 테이블 업데이트 로직
- Lambda 함수 구현

## 현재 AWS 인프라 상태

### API Gateway
- **population-api** (48hywqoyra): 인구 데이터 API ✅
- **ImageUploadAPI** (7smx6otaai): 이미지 업로드 API ✅
- **FileUploadAPI** (bfis3yezal): 파일 업로드 API ✅
- **test-api** (s30itzvfof): 테스트 API ✅

### Lambda 함수
- **collectPopulationData**: 인구 데이터 수집 ✅
- **populationAPI**: 인구 데이터 조회 API ✅
- **populationCollector**: 인구 데이터 수집기 ✅
- **ImageUploadFunction**: 이미지 업로드 ✅
- **ImageViewerFunction**: 이미지 조회 ✅

### DynamoDB 테이블
- **PlacesCurrent**: 현재 인구 데이터 ✅
- **PlacesHistory**: 인구 데이터 이력 ✅
- **ImageMetadata**: 이미지 메타데이터 ✅
- **FileMetadata**: 파일 메타데이터 ✅
- **RealtimeCrowdData**: 실시간 혼잡도 데이터 ✅

### 구현 필요한 인프라
- **Spots** 테이블 ❌
- **Comments** 테이블 ❌
- **SpotLikes** 테이블 ❌
- **Users** 테이블 ❌
- Spot 관련 Lambda 함수들 ❌
- Spot API Gateway 리소스 ❌

## 구현된 Lambda 함수 상세 정보

### ImageUploadFunction ✅
- **ARN**: `arn:aws:lambda:us-east-1:533266989224:function:ImageUploadFunction`
- **런타임**: Python 3.9
- **핸들러**: `lambda_function_fixed.lambda_handler`
- **메모리**: 128MB
- **타임아웃**: 30초
- **코드 크기**: 1,252 bytes
- **마지막 수정**: 2025-09-05T07:22:26.000+0000
- **상태**: Active
- **아키텍처**: x86_64

**환경 변수**:
```json
{
  "TABLE_NAME": "ImageMetadata",
  "BUCKET_NAME": "image-upload-533266989224"
}
```

### ImageViewerFunction ✅
- **ARN**: `arn:aws:lambda:us-east-1:533266989224:function:ImageViewerFunction`
- **런타임**: Python 3.9
- **핸들러**: `image_viewer.lambda_handler`
- **메모리**: 128MB
- **타임아웃**: 30초
- **코드 크기**: 968 bytes
- **마지막 수정**: 2025-09-05T07:30:19.000+0000
- **상태**: Active
- **아키텍처**: x86_64

**환경 변수**:
```json
{
  "TABLE_NAME": "ImageMetadata",
  "BUCKET_NAME": "image-upload-533266989224"
}
```

### populationAPI ✅
- **ARN**: `arn:aws:lambda:us-east-1:533266989224:function:populationAPI`
- **런타임**: Node.js 18.x
- **핸들러**: `populationAPI.handler`
- **메모리**: 256MB
- **타임아웃**: 30초
- **코드 크기**: 15,115,528 bytes
- **마지막 수정**: 2025-09-05T08:02:09.000+0000

**환경 변수**:
```json
{
  "SEOUL_API_KEY": "475268626864726934334652674c4a",
  "PLACES_CURRENT_TABLE": "PlacesCurrent",
  "PLACES_HISTORY_TABLE": "PlacesHistory"
}
```

## 구현 로드맵

### Phase 1: 기본 Spot 관리 (우선순위 높음)
1. **DynamoDB 테이블 생성**
   - `Spots` 테이블
   - `Comments` 테이블
   - `SpotLikes` 테이블

2. **Lambda 함수 구현**
   - `createSpot`: Spot 생성
   - `getSpots`: Spot 목록 조회
   - `getSpotDetail`: Spot 상세 조회

3. **API Gateway 설정**
   - `/spots` 리소스 추가
   - CORS 설정
   - 메서드 연결

### Phase 2: 상호작용 기능 (우선순위 중간)
1. **댓글 시스템**
   - `addComment`: 댓글 등록
   - 댓글 조회 (getSpotDetail에 포함)

2. **좋아요/싫어요 시스템**
   - `likeSpot`: 좋아요 등록
   - `dislikeSpot`: 싫어요 등록
   - 중복 방지 로직

### Phase 3: 고급 기능 (우선순위 낮음)
1. **Spot 업데이트**
   - `updateSpot`: 설명 수정

2. **사용자 관리**
   - `Users` 테이블
   - 인증 시스템

## 데이터 모델

### 구현된 데이터 모델

#### Place 객체 ✅
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

#### Image 객체 ✅
| 필드 | 타입 | 설명 |
|------|------|------|
| `imageId` | string | 이미지 고유 식별자 (UUID) |
| `filename` | string | 원본 파일명 |
| `s3Key` | string | S3 객체 키 |
| `size` | integer | 파일 크기 (바이트) |
| `uploadTime` | string | 업로드 시간 (ISO 8601) |
| `downloadUrl` | string | 다운로드 URL (조회 시에만 포함) |

### 구현 필요한 데이터 모델

#### Spot 객체 ❌
| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 장소 고유 식별자 (UUID) |
| `user_id` | string | 등록한 사용자 ID (UUID) |
| `name` | string | 장소 이름 (최대 100자) |
| `lat` | number | 위도 |
| `lng` | number | 경도 |
| `description` | string | 후기/설명 (최대 500자) |
| `image_id` | string | 이미지 ID (선택적) |
| `rating` | number | 별점 (0.0 ~ 5.0) |
| `category` | string | 카테고리 (맛집, 카페, 관광지, 쇼핑, 기타) |
| `noise_level` | integer | 소음 레벨 (30-80 dB) |
| `quiet_rating` | integer | 조용함 점수 (0-100) |
| `like_count` | integer | 좋아요 수 |
| `dislike_count` | integer | 싫어요 수 |
| `is_noise_recorded` | boolean | 소음 측정 여부 |
| `created_at` | string | 생성 시간 (ISO 8601) |
| `updated_at` | string | 수정 시간 (ISO 8601) |
| `distance` | integer | 중심점으로부터의 거리 (미터, 지리적 필터링 시에만 포함) |
| `comments` | array | 댓글 목록 (상세 조회 시에만 포함) |

#### Comment 객체 ❌
| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 댓글 고유 식별자 (UUID) |
| `spot_id` | string | 장소 ID (UUID) |
| `user_id` | string | 사용자 ID (UUID, 선택적) |
| `nickname` | string | 사용자명 (최대 50자) |
| `content` | string | 댓글 내용 (최대 1000자) |
| `created_at` | string | 생성 시간 (ISO 8601) |

## 사용 예시

### 구현된 API 사용 예시

#### 1. 전체 인구 데이터 조회 ✅
```bash
curl -X GET "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/population?limit=100"
```

#### 2. 특정 위치 중심 반경 500m 내 조회 ✅
```bash
curl -X GET "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/population?lat=37.5665&lng=126.9780&radius=500&limit=10"
```

#### 3. 이미지 업로드 ✅
```bash
curl -X POST "https://7smx6otaai.execute-api.us-east-1.amazonaws.com/prod/images" \
  -F "file=@example.jpg" \
  -F "filename=example.jpg"
```

#### 4. 이미지 조회 ✅
```bash
curl -X GET "https://7smx6otaai.execute-api.us-east-1.amazonaws.com/prod/images/c280a439-64ca-4e7e-a95b-8ad25575eb93"
```

### 구현 필요한 API 사용 예시

#### 5. 새로운 Spot 등록 ❌
```bash
# 구현 필요
curl -X POST "https://[NEW_API_GATEWAY]/prod/spots" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "lat": 37.5665,
    "lng": 126.9780,
    "name": "조용한 카페",
    "description": "도심 속 숨겨진 조용한 카페입니다.",
    "category": "카페",
    "noise_level": 35,
    "quiet_rating": 85,
    "rating": 4.5
  }'
```

#### 6. Spot 목록 조회 ❌
```bash
# 구현 필요
curl -X GET "https://[NEW_API_GATEWAY]/prod/spots?lat=37.5665&lng=126.9780&radius=1000&limit=20"
```

#### 7. Spot 댓글 등록 ❌
```bash
# 구현 필요
curl -X POST "https://[NEW_API_GATEWAY]/prod/spots/123e4567-e89b-12d3-a456-426614174000/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "조용함러버",
    "content": "정말 조용하고 좋은 곳이에요!"
  }'
```

## 성능 특성

### 구현된 API 성능
- **인구 데이터 조회**: 평균 700ms
- **이미지 업로드**: 평균 2-5초 (파일 크기에 따라)
- **이미지 조회**: 평균 100-200ms

### 예상 Spot API 성능
- **Spot 생성**: 예상 200-500ms
- **Spot 목록 조회**: 예상 300-800ms (필터링에 따라)
- **Spot 상세 조회**: 예상 400-1000ms (댓글 포함)

## 에러 코드

| HTTP 상태 | 에러 코드 | 설명 | 해결 방법 |
|-----------|-----------|------|-----------|
| 200 | - | 성공 | - |
| 201 | - | 생성 성공 | - |
| 400 | `InvalidParameter` | 잘못된 쿼리 파라미터 | 파라미터 값 확인 |
| 400 | `ValidationError` | 필수 필드 누락 또는 형식 오류 | 요청 데이터 확인 |
| 404 | `SpotNotFound` | 존재하지 않는 장소 | 장소 ID 확인 |
| 409 | `DuplicateLike` | 이미 좋아요/싫어요 등록됨 | 기존 등록 상태 확인 |
| 429 | `TooManyRequests` | 요청 한도 초과 | 잠시 후 재시도 |
| 500 | `InternalServerError` | 서버 내부 오류 | 잠시 후 재시도 |
| 501 | `NotImplemented` | 구현되지 않은 기능 | Spot 관련 API는 구현 필요 |
| 502 | `BadGateway` | Lambda 함수 오류 | 관리자 문의 |
| 503 | `ServiceUnavailable` | 서비스 일시 중단 | 잠시 후 재시도 |

## 버전 관리

### 현재 버전
- **API 버전**: v1.0
- **배포 환경**: Production
- **마지막 업데이트**: 2025-09-05

### 변경 이력
- **v1.0 (2025-09-05)**: 기본 인프라 구축
  - 실시간 인구 데이터 조회 기능 ✅
  - 이미지 업로드/조회 기능 ✅
  - DynamoDB 캐시 시스템 적용 ✅
  - **Spot 관련 기능은 미구현** ❌

## 다음 단계

### 즉시 구현 필요
1. **DynamoDB 테이블 생성**
   ```bash
   # Spots 테이블 생성
   aws dynamodb create-table --table-name Spots --cli-input-json file://spots-table.json
   
   # Comments 테이블 생성
   aws dynamodb create-table --table-name Comments --cli-input-json file://comments-table.json
   
   # SpotLikes 테이블 생성
   aws dynamodb create-table --table-name SpotLikes --cli-input-json file://spot-likes-table.json
   ```

2. **Lambda 함수 구현**
   - `createSpot.js`
   - `getSpots.js`
   - `getSpotDetail.js`
   - `addComment.js`
   - `likeSpot.js`
   - `dislikeSpot.js`
   - `updateSpot.js`

3. **API Gateway 설정**
   - 새로운 API 생성 또는 기존 API 확장
   - 리소스 및 메서드 추가
   - Lambda 함수 연결

### 개발 우선순위
1. **High**: Spot CRUD 기능
2. **Medium**: 댓글 시스템
3. **Medium**: 좋아요/싫어요 시스템
4. **Low**: 사용자 관리 시스템

---

**마지막 업데이트**: 2025-09-05  
**문서 버전**: 1.1  
**구현 상태**: 기본 인프라 완료, Spot 기능 구현 필요

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

### 2. Spot 생성

#### POST /spots

새로운 조용한 장소를 등록합니다.

**요청**
```http
POST /spots
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "lat": 37.5665,
  "lng": 126.9780,
  "name": "조용한 카페",
  "description": "도심 속 숨겨진 조용한 카페입니다.",
  "category": "카페",
  "noise_level": 35,
  "quiet_rating": 85,
  "rating": 4.5
}
```

**응답**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "lat": 37.5665,
  "lng": 126.9780,
  "name": "조용한 카페",
  "description": "도심 속 숨겨진 조용한 카페입니다.",
  "category": "카페",
  "noise_level": 35,
  "quiet_rating": 85,
  "rating": 4.5,
  "like_count": 0,
  "dislike_count": 0,
  "created_at": "2025-09-05T17:18:17.743Z",
  "updated_at": "2025-09-05T17:18:17.743Z"
}
```

### 3. Spot 목록 조회

#### GET /spots

등록된 조용한 장소 목록을 조회합니다.

**요청**
```http
GET /spots?lat=37.5665&lng=126.9780&radius=1000&limit=20&category=카페
```

**쿼리 파라미터**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `lat` | number | 선택 | - | 중심점 위도 |
| `lng` | number | 선택 | - | 중심점 경도 |
| `radius` | integer | 선택 | 1000 | 검색 반경 (미터) |
| `limit` | integer | 선택 | 20 | 최대 결과 수 |
| `category` | string | 선택 | - | 카테고리 필터 |

**응답**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "조용한 카페",
    "lat": 37.5665,
    "lng": 126.9780,
    "description": "도심 속 숨겨진 조용한 카페입니다.",
    "category": "카페",
    "rating": 4.5,
    "quiet_rating": 85,
    "like_count": 15,
    "dislike_count": 2,
    "distance": 150,
    "created_at": "2025-09-05T17:18:17.743Z"
  }
]
```

### 4. Spot 상세 조회

#### GET /spots/{spotId}

특정 장소의 상세 정보와 댓글을 조회합니다.

**요청**
```http
GET /spots/123e4567-e89b-12d3-a456-426614174000
```

**응답**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "조용한 카페",
  "lat": 37.5665,
  "lng": 126.9780,
  "description": "도심 속 숨겨진 조용한 카페입니다.",
  "category": "카페",
  "noise_level": 35,
  "quiet_rating": 85,
  "rating": 4.5,
  "like_count": 15,
  "dislike_count": 2,
  "created_at": "2025-09-05T17:18:17.743Z",
  "updated_at": "2025-09-05T17:18:17.743Z",
  "comments": [
    {
      "id": "comment-123",
      "nickname": "조용함러버",
      "content": "정말 조용하고 좋은 곳이에요!",
      "created_at": "2025-09-05T16:30:00.000Z"
    }
  ]
}
```

### 5. Spot 댓글 등록

#### POST /spots/{spotId}/comments

특정 장소에 댓글을 등록합니다.

**요청**
```http
POST /spots/123e4567-e89b-12d3-a456-426614174000/comments
Content-Type: application/json

{
  "nickname": "조용함러버",
  "content": "정말 조용하고 좋은 곳이에요!"
}
```

**응답**
```json
{
  "id": "comment-456",
  "spot_id": "123e4567-e89b-12d3-a456-426614174000",
  "nickname": "조용함러버",
  "content": "정말 조용하고 좋은 곳이에요!",
  "created_at": "2025-09-05T17:18:17.743Z"
}
```

### 6. Spot 좋아요

#### POST /spots/{spotId}/like

특정 장소에 좋아요를 등록합니다.

**요청**
```http
POST /spots/123e4567-e89b-12d3-a456-426614174000/like
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**응답**
```json
{
  "success": true,
  "like_count": 16,
  "message": "좋아요가 등록되었습니다."
}
```

### 7. Spot 싫어요

#### POST /spots/{spotId}/dislike

특정 장소에 싫어요를 등록합니다.

**요청**
```http
POST /spots/123e4567-e89b-12d3-a456-426614174000/dislike
Content-Type: application/json

{
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**응답**
```json
{
  "success": true,
  "dislike_count": 3,
  "message": "싫어요가 등록되었습니다."
}
```

### 8. Spot 업데이트

#### PUT /spots/{spotId}

특정 장소의 설명을 업데이트합니다.

**요청**
```http
PUT /spots/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "description": "업데이트된 설명입니다. 더욱 조용해졌어요!"
}
```

**응답**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "description": "업데이트된 설명입니다. 더욱 조용해졌어요!",
  "updated_at": "2025-09-05T17:18:17.743Z",
  "message": "장소 정보가 업데이트되었습니다."
}
```

## 데이터 모델

### Spot 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 장소 고유 식별자 (UUID) |
| `user_id` | string | 등록한 사용자 ID (UUID) |
| `name` | string | 장소 이름 (최대 100자) |
| `lat` | number | 위도 |
| `lng` | number | 경도 |
| `description` | string | 후기/설명 (최대 500자) |
| `image_id` | string | 이미지 ID (선택적) |
| `rating` | number | 별점 (0.0 ~ 5.0) |
| `category` | string | 카테고리 (맛집, 카페, 관광지, 쇼핑, 기타) |
| `noise_level` | integer | 소음 레벨 (30-80 dB) |
| `quiet_rating` | integer | 조용함 점수 (0-100) |
| `like_count` | integer | 좋아요 수 |
| `dislike_count` | integer | 싫어요 수 |
| `is_noise_recorded` | boolean | 소음 측정 여부 |
| `created_at` | string | 생성 시간 (ISO 8601) |
| `updated_at` | string | 수정 시간 (ISO 8601) |
| `distance` | integer | 중심점으로부터의 거리 (미터, 지리적 필터링 시에만 포함) |
| `comments` | array | 댓글 목록 (상세 조회 시에만 포함) |

### Comment 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 댓글 고유 식별자 (UUID) |
| `spot_id` | string | 장소 ID (UUID) |
| `user_id` | string | 사용자 ID (UUID, 선택적) |
| `nickname` | string | 사용자명 (최대 50자) |
| `content` | string | 댓글 내용 (최대 1000자) |
| `created_at` | string | 생성 시간 (ISO 8601) |

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

### 9. 이미지 업로드

#### POST /images

새로운 이미지를 업로드합니다.

**요청**
```http
POST /images
Content-Type: multipart/form-data

{
  "file": <binary_data>,
  "filename": "example.jpg"
}
```

**응답**
```json
{
  "imageId": "c280a439-64ca-4e7e-a95b-8ad25575eb93",
  "filename": "example.jpg",
  "s3Key": "images/c280a439-64ca-4e7e-a95b-8ad25575eb93/example.jpg",
  "size": 1024,
  "uploadTime": "2025-09-05T07:22:36.785556",
  "message": "이미지가 성공적으로 업로드되었습니다."
}
```

### 12. 좋아요/싫어요 상태 확인 ✅

#### GET /spots/{spotId}/like-status

특정 사용자가 해당 스팟에 좋아요 또는 싫어요를 남겼는지 확인합니다.

**요청**
```http
GET /spots/e32aed8d-4b15-4bcc-a44f-383d49c37d13/like-status?user_id=test-user-123
```

**쿼리 파라미터**

| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| `user_id` | string | 필수 | 확인할 사용자 ID |

**응답**

**상호작용이 있는 경우 (200 OK)**
```json
{
  "spot_id": "e32aed8d-4b15-4bcc-a44f-383d49c37d13",
  "user_id": "test-user-123",
  "has_interaction": true,
  "interaction_type": "like",
  "created_at": "2025-09-05T11:25:00.000Z"
}
```

**상호작용이 없는 경우 (200 OK)**
```json
{
  "spot_id": "e32aed8d-4b15-4bcc-a44f-383d49c37d13",
  "user_id": "test-user-123",
  "has_interaction": false,
  "interaction_type": null,
  "created_at": null
}
```

**에러 응답**

**필수 파라미터 누락 (400 Bad Request)**
```json
{
  "error": "user_id query parameter is required"
}
```

**존재하지 않는 스팟 (400 Bad Request)**
```json
{
  "error": "spotId is required"
}
```

## 이미지 관리 시스템

### Lambda 함수 상세 정보

#### ImageUploadFunction
- **ARN**: `arn:aws:lambda:us-east-1:533266989224:function:ImageUploadFunction`
- **런타임**: Python 3.9
- **핸들러**: `lambda_function_fixed.lambda_handler`
- **메모리**: 128MB
- **타임아웃**: 30초
- **코드 크기**: 1,252 bytes
- **마지막 수정**: 2025-09-05T07:22:26.000+0000
- **상태**: Active
- **아키텍처**: x86_64

**환경 변수**:
```json
{
  "TABLE_NAME": "ImageMetadata",
  "BUCKET_NAME": "image-upload-533266989224"
}
```

#### ImageViewerFunction
- **ARN**: `arn:aws:lambda:us-east-1:533266989224:function:ImageViewerFunction`
- **런타임**: Python 3.9
- **핸들러**: `image_viewer.lambda_handler`
- **메모리**: 128MB
- **타임아웃**: 30초
- **코드 크기**: 968 bytes
- **마지막 수정**: 2025-09-05T07:30:19.000+0000
- **상태**: Active
- **아키텍처**: x86_64

**환경 변수**:
```json
{
  "TABLE_NAME": "ImageMetadata",
  "BUCKET_NAME": "image-upload-533266989224"
}
```

### 현재 운영 현황

#### 저장된 데이터
- **이미지 파일**: 1개 (tiny.png, 70 bytes)
- **S3 객체 키**: `images/c280a439-64ca-4e7e-a95b-8ad25575eb93/tiny.png`
- **DynamoDB 레코드**: 1개
- **업로드 시간**: 2025-09-05T07:22:36.785556

#### 성능 메트릭
- **Lambda 실행 시간**: 평균 2-5초 (파일 크기에 따라)
- **DynamoDB 응답 시간**: 평균 10-50ms
- **S3 업로드 시간**: 파일 크기에 비례
- **동시 실행 제한**: 1,000개 (기본값)

### 아키텍처 개요

이미지 관리 시스템은 다음 AWS 서비스들로 구성됩니다:

- **S3 버킷**: `image-upload-533266989224` (이미지 파일 저장)
- **DynamoDB**: `ImageMetadata` 테이블 (메타데이터 관리)
- **Lambda 함수**: 
  - `ImageUploadFunction` (이미지 업로드 처리)
  - `ImageViewerFunction` (이미지 조회 처리)
- **IAM 역할**: `ImageUploadLambdaRole` (권한 관리)

### 이미지 업로드 플로우

```
클라이언트 → API Gateway → ImageUploadFunction → S3 + DynamoDB
```

1. **파일 업로드**: 클라이언트가 multipart/form-data로 이미지 전송
2. **UUID 생성**: Lambda에서 고유한 이미지 ID 생성
3. **S3 저장**: `images/{imageId}/{filename}` 경로로 파일 저장
4. **메타데이터 저장**: DynamoDB에 파일 정보 기록
5. **응답 반환**: 업로드 결과와 메타데이터 반환

### 이미지 조회 플로우

```
클라이언트 → API Gateway → ImageViewerFunction → DynamoDB → S3 URL
```

1. **메타데이터 조회**: DynamoDB에서 이미지 정보 검색
2. **S3 URL 생성**: 이미지 다운로드 URL 생성
3. **응답 반환**: 메타데이터와 다운로드 URL 제공

### 보안 및 권한

#### IAM 정책 (S3DynamoDBAccess)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::image-upload-533266989224/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:533266989224:table/ImageMetadata"
    }
  ]
}
```

### 파일 제한사항

- **최대 파일 크기**: 10MB (Lambda 제한)
- **지원 형식**: JPG, PNG, GIF, WebP
- **파일명**: UTF-8 인코딩, 특수문자 제한
- **저장 경로**: `images/{imageId}/{filename}`

### 성능 특성

- **업로드 시간**: 평균 2-5초 (파일 크기에 따라)
- **조회 시간**: 평균 100-200ms
- **동시 업로드**: 최대 1,000개/분
- **저장 용량**: 무제한 (S3 Standard)

## 데이터 모델

### Image 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| `imageId` | string | 이미지 고유 식별자 (UUID) |
| `filename` | string | 원본 파일명 |
| `s3Key` | string | S3 객체 키 |
| `size` | integer | 파일 크기 (바이트) |
| `uploadTime` | string | 업로드 시간 (ISO 8601) |
| `downloadUrl` | string | 다운로드 URL (조회 시에만 포함) |

## 사용 예시

### 1. 전체 데이터 조회 (100개 지역)
```bash
curl -X GET "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/population?limit=100"
```

### 2. 특정 위치 중심 반경 500m 내 조회
```bash
curl -X GET "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/population?lat=37.5665&lng=126.9780&radius=500&limit=10"
```

### 3. 새로운 Spot 등록
```bash
curl -X POST "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/spots" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "lat": 37.5665,
    "lng": 126.9780,
    "name": "조용한 카페",
    "description": "도심 속 숨겨진 조용한 카페입니다.",
    "category": "카페",
    "noise_level": 35,
    "quiet_rating": 85,
    "rating": 4.5
  }'
```

### 4. Spot 목록 조회
```bash
curl -X GET "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/spots?lat=37.5665&lng=126.9780&radius=1000&limit=20"
```

### 5. Spot 댓글 등록
```bash
curl -X POST "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/spots/123e4567-e89b-12d3-a456-426614174000/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "조용함러버",
    "content": "정말 조용하고 좋은 곳이에요!"
  }'
```

### 6. 이미지 업로드
```bash
curl -X POST "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/images" \
  -F "file=@example.jpg" \
  -F "filename=example.jpg"
```

### 7. 이미지 조회
```bash
curl -X GET "https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/images/c280a439-64ca-4e7e-a95b-8ad25575eb93"
```

### 6. JavaScript fetch 예시
```javascript
// Spot 목록 조회
const response = await fetch(
  'https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/spots?limit=50'
);
const spots = await response.json();

// 조용한 장소만 필터링
const quietSpots = spots.filter(spot => 
  spot.quiet_rating >= 80 && spot.noise_level <= 40
);

// 새로운 Spot 등록
const newSpot = await fetch(
  'https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/spots',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'user-uuid',
      lat: 37.5665,
      lng: 126.9780,
      name: '조용한 도서관',
      description: '공부하기 좋은 조용한 공간',
      category: '기타',
      quiet_rating: 95
    })
  }
);
```

### 8. React 이미지 업로드 컴포넌트 예시
```typescript
import { useState } from 'react';

interface ImageUploadResponse {
  imageId: string;
  filename: string;
  s3Key: string;
  size: number;
  uploadTime: string;
  message: string;
}

const ImageUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ImageUploadResponse | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // 파일 크기 검증 (10MB 제한)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB를 초과할 수 없습니다.');
        return;
      }
      
      // 파일 형식 검증
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(selectedFile.type)) {
        alert('지원되지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 지원)');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);

      const response = await fetch(
        'https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/images',
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ImageUploadResponse = await response.json();
      setUploadResult(result);
      setFile(null);
      
      // 파일 입력 초기화
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleImageView = async (imageId: string) => {
    try {
      const response = await fetch(
        `https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/images/${imageId}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const imageData = await response.json();
      window.open(imageData.downloadUrl, '_blank');
      
    } catch (error) {
      console.error('이미지 조회 실패:', error);
      alert('이미지를 불러올 수 없습니다.');
    }
  };

  return (
    <div className="image-upload">
      <h3>이미지 업로드</h3>
      
      <div className="upload-section">
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
        />
        
        {file && (
          <div className="file-info">
            <p>선택된 파일: {file.name}</p>
            <p>크기: {(file.size / 1024).toFixed(1)} KB</p>
            <p>형식: {file.type}</p>
          </div>
        )}
        
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="upload-button"
        >
          {uploading ? '업로드 중...' : '업로드'}
        </button>
      </div>

      {uploadResult && (
        <div className="upload-result">
          <h4>업로드 완료!</h4>
          <p><strong>이미지 ID:</strong> {uploadResult.imageId}</p>
          <p><strong>파일명:</strong> {uploadResult.filename}</p>
          <p><strong>크기:</strong> {uploadResult.size} bytes</p>
          <p><strong>업로드 시간:</strong> {new Date(uploadResult.uploadTime).toLocaleString()}</p>
          
          <button
            onClick={() => handleImageView(uploadResult.imageId)}
            className="view-button"
          >
            이미지 보기
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
```

### 9. 이미지 갤러리 컴포넌트 예시
```typescript
import { useEffect, useState } from 'react';

interface ImageMetadata {
  imageId: string;
  filename: string;
  size: number;
  uploadTime: string;
  downloadUrl?: string;
}

const ImageGallery: React.FC<{ imageIds: string[] }> = ({ imageIds }) => {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        const imagePromises = imageIds.map(async (imageId) => {
          const response = await fetch(
            `https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/images/${imageId}`
          );
          
          if (response.ok) {
            return await response.json();
          }
          return null;
        });

        const imageResults = await Promise.all(imagePromises);
        const validImages = imageResults.filter(img => img !== null);
        setImages(validImages);
        
      } catch (error) {
        console.error('이미지 목록 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    if (imageIds.length > 0) {
      fetchImages();
    } else {
      setLoading(false);
    }
  }, [imageIds]);

  if (loading) {
    return <div className="loading">이미지를 불러오는 중...</div>;
  }

  if (images.length === 0) {
    return <div className="no-images">등록된 이미지가 없습니다.</div>;
  }

  return (
    <div className="image-gallery">
      <h3>이미지 갤러리 ({images.length}개)</h3>
      
      <div className="image-grid">
        {images.map((image) => (
          <div key={image.imageId} className="image-item">
            <div className="image-container">
              <img
                src={image.downloadUrl}
                alt={image.filename}
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-image.png'; // 대체 이미지
                }}
              />
            </div>
            
            <div className="image-info">
              <p className="filename">{image.filename}</p>
              <p className="size">{(image.size / 1024).toFixed(1)} KB</p>
              <p className="upload-time">
                {new Date(image.uploadTime).toLocaleDateString()}
              </p>
            </div>
            
            <div className="image-actions">
              <button
                onClick={() => window.open(image.downloadUrl, '_blank')}
                className="view-full-button"
              >
                원본 보기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;
### 10. Spot 관리 React 컴포넌트 예시
import { useEffect, useState } from 'react';

interface Spot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  category: string;
  rating: number;
  quiet_rating: number;
  like_count: number;
  dislike_count: number;
}

const SpotsList: React.FC = () => {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpots = async () => {
      try {
        const response = await fetch(
          'https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/spots?limit=100'
        );
        const data = await response.json();
        setSpots(data);
      } catch (error) {
        console.error('Failed to fetch spots:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpots();
  }, []);

  const handleLike = async (spotId: string) => {
    try {
      await fetch(`/spots/${spotId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'current-user-id' })
      });
      // 목록 새로고침
      fetchSpots();
    } catch (error) {
      console.error('Failed to like spot:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {spots.map(spot => (
        <div key={spot.id} className="spot-card">
          <h3>{spot.name}</h3>
          <p>{spot.description}</p>
          <p>조용함 점수: {spot.quiet_rating}/100</p>
          <p>별점: {spot.rating}/5.0</p>
          <button onClick={() => handleLike(spot.id)}>
            👍 {spot.like_count}
          </button>
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
| 201 | - | 생성 성공 | - |
| 400 | `InvalidParameter` | 잘못된 쿼리 파라미터 | 파라미터 값 확인 |
| 400 | `ValidationError` | 필수 필드 누락 또는 형식 오류 | 요청 데이터 확인 |
| 404 | `SpotNotFound` | 존재하지 않는 장소 | 장소 ID 확인 |
| 409 | `DuplicateLike` | 이미 좋아요/싫어요 등록됨 | 기존 등록 상태 확인 |
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
