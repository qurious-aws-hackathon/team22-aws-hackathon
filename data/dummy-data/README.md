# 더미 데이터 생성 스크립트

쉿플레이스 프로젝트의 DynamoDB 테이블에 더미 데이터를 생성하는 스크립트들입니다.

## 설치

```bash
npm install
```

## 사용법

### 1. 사용자 더미 데이터 생성 (100개)
```bash
npm run generate-users
```

### 2. Spot 더미 데이터 생성 (50개)
```bash
npm run generate-spots
```

### 3. 댓글 더미 데이터 생성 (150개)
```bash
npm run generate-comments
```

### 4. 모든 더미 데이터 생성 (순서대로)
```bash
npm run generate-all
```

## 생성되는 데이터

### Users 테이블 (100개)
- **닉네임**: 한국어 닉네임 (중복 없음)
- **비밀번호**: SHA256 해시 (password1~password100)
- **생성일**: 최근 1년 내 랜덤 날짜
- **파일 저장**: `users-dummy-data.json`

### Spots 테이블 (50개)
- **위치**: 서울시 내 랜덤 좌표 (37.4~37.7N, 126.8~127.2E)
- **카테고리**: 카페, 도서관, 공원, 기타
- **이름**: 카테고리별 한국어 장소명
- **소음 레벨**: 25-54dB (조용한 범위)
- **조용함 점수**: 70-99점 (높은 점수)
- **별점**: 3.0-5.0점
- **생성일**: 최근 6개월 내 랜덤 날짜
- **파일 저장**: `spots-dummy-data.json`

### Comments 테이블 (150개)
- **내용**: 한국어 리뷰 댓글 (50가지 템플릿)
- **닉네임**: 댓글용 닉네임 (30가지)
- **사용자 연결**: 100% 실제 사용자와 연결 (user_id NOT NULL)
- **생성일**: 최근 3개월 내 랜덤 날짜
- **파일 저장**: `comments-dummy-data.json`

## 데이터 구조

### Users
```json
{
  "id": "uuid",
  "nickname": "조용한산책자",
  "password": "hashed_password",
  "created_at": "2024-12-15T10:30:00.000Z",
  "updated_at": "2025-09-05T08:58:51.000Z"
}
```

### Spots
```json
{
  "id": "uuid",
  "user_id": "user_uuid",
  "lat": 37.566535,
  "lng": 126.977969,
  "name": "조용한 북카페",
  "description": "정말 조용하고 평화로운 곳입니다...",
  "category": "카페",
  "noise_level": 35,
  "quiet_rating": 85,
  "rating": 4.5,
  "like_count": 12,
  "dislike_count": 1,
  "is_noise_recorded": false,
  "created_at": "2025-03-15T14:20:00.000Z",
  "updated_at": "2025-03-15T14:20:00.000Z",
  "geohash": "wydm8b2"
}
```

### Comments
```json
{
  "id": "uuid",
  "spot_id": "spot_uuid",
  "user_id": "user_uuid",
  "nickname": "조용함추구자",
  "content": "정말 조용하고 좋은 곳이네요!",
  "created_at": "2025-07-20T16:45:00.000Z"
}
```

## 데이터 정합성

- **Users → Spots**: 모든 Spot은 실제 User가 생성
- **Users → Comments**: 100%의 Comment는 실제 User와 연결 (user_id NOT NULL)
- **Spots → Comments**: 모든 Comment는 실제 Spot에 연결
- **지리적 정합성**: 모든 Spot은 서울시 경계 내 위치
- **시간적 정합성**: 생성 시간 순서 보장

## 주의사항

- AWS 자격 증명이 설정되어 있어야 합니다
- DynamoDB 테이블이 미리 생성되어 있어야 합니다
- 실행 순서: Users → Spots → Comments
- 배치 쓰기로 25개씩 처리됩니다

## 파일 구조

```
data/dummy-data/
├── README.md
├── package.json
├── generate-users.js          # 사용자 더미 데이터 생성 (100개)
├── generate-spots.js          # Spot 더미 데이터 생성 (50개)
├── generate-comments.js       # 댓글 더미 데이터 생성 (150개)
├── users-dummy-data.json      # 생성된 사용자 데이터
├── spots-dummy-data.json      # 생성된 Spot 데이터
└── comments-dummy-data.json   # 생성된 댓글 데이터
```

## 통계 정보

생성 완료 후 다음 통계가 표시됩니다:
- 평균 Spot당 댓글 수
- 댓글이 있는 Spot 비율
- 카테고리별 Spot 분포
- 지역별 데이터 분포
