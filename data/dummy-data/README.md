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

### 2. Spot 더미 데이터 생성 (예정)
```bash
npm run generate-spots
```

### 3. 댓글 더미 데이터 생성 (예정)
```bash
npm run generate-comments
```

## 생성되는 데이터

### Users 테이블
- **개수**: 100개
- **닉네임**: 한국어 닉네임 (중복 없음)
- **비밀번호**: SHA256 해시 (password1~password100)
- **생성일**: 최근 1년 내 랜덤 날짜
- **파일 저장**: `users-dummy-data.json`

### 데이터 구조
```json
{
  "id": "uuid",
  "nickname": "조용한산책자",
  "password": "hashed_password",
  "created_at": "2024-12-15T10:30:00.000Z",
  "updated_at": "2025-09-05T08:58:51.000Z"
}
```

## 주의사항

- AWS 자격 증명이 설정되어 있어야 합니다
- DynamoDB 테이블이 미리 생성되어 있어야 합니다
- 배치 쓰기로 25개씩 처리됩니다
- 실행 전 테이블 상태를 확인하세요

## 파일 구조

```
data/dummy-data/
├── README.md
├── package.json
├── generate-users.js          # 사용자 더미 데이터 생성
├── generate-spots.js          # Spot 더미 데이터 생성 (예정)
├── generate-comments.js       # 댓글 더미 데이터 생성 (예정)
├── users-dummy-data.json      # 생성된 사용자 데이터
├── spots-dummy-data.json      # 생성된 Spot 데이터 (예정)
└── comments-dummy-data.json   # 생성된 댓글 데이터 (예정)
```
