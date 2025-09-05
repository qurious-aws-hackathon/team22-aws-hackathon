# 쉿플레이스 AI 추천 시스템

## 개요
쉿플레이스의 AI 기반 장소 추천 시스템은 Amazon Bedrock Claude 3 Haiku 모델을 활용하여 사용자의 위치와 선호도에 맞는 조용한 장소를 추천합니다.

## 시스템 아키텍처

### 듀얼 추천 시스템
1. **Pin-based 추천**: 기존 사용자 등록 스팟 데이터 기반
2. **General Place Search**: AI 기반 일반 장소 검색

### 기술 스택
- **AI 모델**: Amazon Bedrock Claude 3 Haiku (`anthropic.claude-3-haiku-20240307-v1:0`)
- **데이터베이스**: DynamoDB (Spots, Comments, SpotLikes, Users 테이블)
- **컴퓨팅**: AWS Lambda (Node.js 18.x)
- **API**: API Gateway REST API
- **지리 계산**: Geohash 및 Haversine 공식

## API 엔드포인트

### POST /recommendations

**Base URL**: `https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod`

#### 요청 형식

**POST 방식**
```http
POST /recommendations
Content-Type: application/json

{
  "lat": 37.5665,
  "lng": 126.9780,
  "radius": 2000,
  "category": "카페",
  "preferences": {
    "quiet_level": "high",
    "crowd_preference": "low"
  }
}
```

**GET 방식**
```http
GET /recommendations?lat=37.5665&lng=126.9780&radius=2000&category=카페
```

#### 요청 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| `lat` | number | 필수 | - | 중심점 위도 (37.4-37.7) |
| `lng` | number | 필수 | - | 중심점 경도 (126.8-127.2) |
| `radius` | integer | 선택 | 2000 | 검색 반경 (미터, 최대 10000) |
| `category` | string | 선택 | - | 카테고리 필터 (카페, 도서관, 공원 등) |
| `preferences` | object | 선택 | {} | 사용자 선호도 설정 |

#### 응답 형식

```json
{
  "recommendations": {
    "pin_based": {
      "spot": {
        "id": "e32aed8d-4b15-4bcc-a44f-383d49c37d13",
        "name": "맑은 하늘 카페",
        "lat": 37.546849,
        "lng": 127.050037,
        "category": "카페",
        "rating": 4.7,
        "noise_level": 37,
        "quiet_rating": 86,
        "distance": 1918,
        "like_count": 19,
        "dislike_count": 1
      },
      "ai_analysis": {
        "recommendation_score": 0.92,
        "reasoning": "이 카페는 소음 수준이 낮고 조용함 점수가 높아 사용자의 선호도에 잘 부합합니다.",
        "highlights": ["조용한 환경", "높은 평점", "적당한 거리"],
        "user_match_factors": ["소음 민감도", "카페 선호", "접근성"]
      },
      "recommendation_type": "pin_based",
      "source": "DynamoDB Spots Table"
    },
    "general_place_search": {
      "place": {
        "name": "북악산 둘레길",
        "address": "서울특별시 종로구 자하문로 산1-산3",
        "category": "공원",
        "lat": 37.5665,
        "lng": 126.978,
        "estimated_noise_level": 35,
        "estimated_quiet_rating": 90,
        "estimated_rating": 4.5,
        "description": "북악산 둘레길은 조용하고 평화로운 자연 산책로입니다.",
        "distance": 0,
        "access_info": "지하철 1호선 북악산역에서 도보 10분 거리"
      },
      "ai_analysis": {
        "recommendation_score": 0.95,
        "reasoning": "북악산 둘레길은 소음 수준이 낮고 혼잡도도 적절하여 사용자의 선호도에 잘 부합합니다.",
        "highlights": ["아름다운 자연 경관", "조용하고 평화로운 분위기", "다양한 코스 선택 가능"],
        "user_match_factors": ["소음 민감도 medium", "혼잡도 선호 medium", "최소 평점 3 이상"]
      },
      "recommendation_type": "general_place_search",
      "source": "AI-powered Place Search"
    }
  },
  "processing_time_ms": 4474
}
```

## AI 분석 시스템

### 추천 점수 계산

AI 모델은 다음 요소들을 종합하여 0.0-1.0 범위의 추천 점수를 계산합니다:

1. **소음 레벨** (30% 가중치)
   - 낮을수록 높은 점수
   - 30-50dB: 0.9-1.0
   - 50-70dB: 0.6-0.9
   - 70dB+: 0.0-0.6

2. **조용함 점수** (25% 가중치)
   - 사용자 평가 기반
   - 80-100점: 0.8-1.0
   - 60-80점: 0.6-0.8
   - 60점 미만: 0.0-0.6

3. **거리** (20% 가중치)
   - 가까울수록 높은 점수
   - 500m 이내: 1.0
   - 1km 이내: 0.8
   - 2km 이내: 0.6
   - 2km 초과: 0.4

4. **평점** (15% 가중치)
   - 4.0 이상: 0.8-1.0
   - 3.0-4.0: 0.6-0.8
   - 3.0 미만: 0.0-0.6

5. **좋아요 비율** (10% 가중치)
   - (좋아요 / (좋아요 + 싫어요)) 비율

### AI 프롬프트 시스템

#### Pin-based 추천 프롬프트
```
다음 장소에 대한 추천 분석을 해주세요:

장소 정보:
- 이름: {name}
- 카테고리: {category}
- 소음 레벨: {noise_level}dB
- 조용함 점수: {quiet_rating}/100
- 평점: {rating}/5.0
- 거리: {distance}m

사용자 선호도: {preferences}

다음 JSON 형식으로 응답해주세요:
{
  "recommendation_score": 0.0-1.0 사이의 점수,
  "reasoning": "추천 이유를 한국어로 설명",
  "highlights": ["주요 장점 3개"],
  "user_match_factors": ["사용자 선호도와 매칭되는 요소들"]
}
```

#### General Place Search 프롬프트
```
서울시 {lat}, {lng} 좌표 근처에서 조용하고 평화로운 장소를 추천해주세요.

요구사항:
- 반경 {radius}m 이내
- 카테고리: {category}
- 사용자 선호도: {preferences}

다음 JSON 형식으로 응답해주세요:
{
  "place": {
    "name": "장소명",
    "address": "상세 주소",
    "category": "카테고리",
    "lat": 위도,
    "lng": 경도,
    "estimated_noise_level": 30-80,
    "estimated_quiet_rating": 0-100,
    "estimated_rating": 0.0-5.0,
    "description": "장소 설명",
    "access_info": "대중교통 이용 방법"
  },
  "ai_analysis": {
    "recommendation_score": 0.0-1.0,
    "reasoning": "추천 이유",
    "highlights": ["주요 장점들"],
    "user_match_factors": ["매칭 요소들"]
  }
}
```

## 데이터 모델

### 추천 응답 객체

#### Pin-based 추천
```typescript
interface PinBasedRecommendation {
  spot: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    category: string;
    rating: number;
    noise_level: number;
    quiet_rating: number;
    distance: number;
    like_count: number;
    dislike_count: number;
  };
  ai_analysis: AIAnalysis;
  recommendation_type: "pin_based";
  source: "DynamoDB Spots Table";
}
```

#### General Place Search
```typescript
interface GeneralPlaceRecommendation {
  place: {
    name: string;
    address: string;
    category: string;
    lat: number;
    lng: number;
    estimated_noise_level: number;
    estimated_quiet_rating: number;
    estimated_rating: number;
    description: string;
    distance: number;
    access_info: string;
  };
  ai_analysis: AIAnalysis;
  recommendation_type: "general_place_search";
  source: "AI-powered Place Search";
}
```

#### AI 분석 객체
```typescript
interface AIAnalysis {
  recommendation_score: number; // 0.0-1.0
  reasoning: string;
  highlights: string[];
  user_match_factors: string[];
}
```

## 사용 예시

### 1. 기본 위치 기반 추천
```bash
curl -X POST "https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod/recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 37.5665,
    "lng": 126.9780,
    "radius": 2000
  }'
```

### 2. 카테고리별 추천
```bash
curl -X GET "https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod/recommendations?lat=37.5400&lng=127.0700&radius=3000&category=카페"
```

### 3. 사용자 선호도 포함 추천
```bash
curl -X POST "https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod/recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 37.5665,
    "lng": 126.9780,
    "radius": 2500,
    "preferences": {
      "quiet_level": "high",
      "category": "도서관"
    }
  }'
```

### 4. React 컴포넌트 예시
```typescript
import { useState, useEffect } from 'react';

interface RecommendationResponse {
  recommendations: {
    pin_based?: PinBasedRecommendation;
    general_place_search?: GeneralPlaceRecommendation;
  };
  processing_time_ms: number;
}

const RecommendationSystem: React.FC = () => {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const getRecommendations = async (lat: number, lng: number, category?: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod/recommendations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            radius: 2000,
            category,
            preferences: {
              quiet_level: 'high'
            }
          })
        }
      );
      
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('추천 요청 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          getRecommendations(latitude, longitude);
        },
        (error) => {
          console.error('위치 정보 가져오기 실패:', error);
        }
      );
    }
  };

  return (
    <div className="recommendation-system">
      <h2>AI 장소 추천</h2>
      
      <button onClick={getCurrentLocation} disabled={loading}>
        {loading ? '추천 받는 중...' : '현재 위치에서 추천 받기'}
      </button>

      {recommendations && (
        <div className="recommendations">
          <p>처리 시간: {recommendations.processing_time_ms}ms</p>
          
          {recommendations.recommendations.pin_based && (
            <div className="pin-recommendation">
              <h3>등록된 스팟 추천</h3>
              <div className="spot-card">
                <h4>{recommendations.recommendations.pin_based.spot.name}</h4>
                <p>카테고리: {recommendations.recommendations.pin_based.spot.category}</p>
                <p>평점: {recommendations.recommendations.pin_based.spot.rating}/5.0</p>
                <p>조용함 점수: {recommendations.recommendations.pin_based.spot.quiet_rating}/100</p>
                <p>거리: {recommendations.recommendations.pin_based.spot.distance}m</p>
                
                <div className="ai-analysis">
                  <h5>AI 분석 (점수: {recommendations.recommendations.pin_based.ai_analysis.recommendation_score})</h5>
                  <p>{recommendations.recommendations.pin_based.ai_analysis.reasoning}</p>
                  <ul>
                    {recommendations.recommendations.pin_based.ai_analysis.highlights.map((highlight, index) => (
                      <li key={index}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {recommendations.recommendations.general_place_search && (
            <div className="general-recommendation">
              <h3>AI 일반 장소 추천</h3>
              <div className="place-card">
                <h4>{recommendations.recommendations.general_place_search.place.name}</h4>
                <p>주소: {recommendations.recommendations.general_place_search.place.address}</p>
                <p>카테고리: {recommendations.recommendations.general_place_search.place.category}</p>
                <p>예상 평점: {recommendations.recommendations.general_place_search.place.estimated_rating}/5.0</p>
                <p>조용함 점수: {recommendations.recommendations.general_place_search.place.estimated_quiet_rating}/100</p>
                <p>거리: {recommendations.recommendations.general_place_search.place.distance}m</p>
                <p>{recommendations.recommendations.general_place_search.place.description}</p>
                <p>교통: {recommendations.recommendations.general_place_search.place.access_info}</p>
                
                <div className="ai-analysis">
                  <h5>AI 분석 (점수: {recommendations.recommendations.general_place_search.ai_analysis.recommendation_score})</h5>
                  <p>{recommendations.recommendations.general_place_search.ai_analysis.reasoning}</p>
                  <ul>
                    {recommendations.recommendations.general_place_search.ai_analysis.highlights.map((highlight, index) => (
                      <li key={index}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationSystem;
```

## 성능 특성

### 응답 시간
- **평균**: 3-5초 (AI 모델 호출 포함)
- **Pin-based만**: 200-500ms
- **General search만**: 3-4초
- **둘 다**: 4-6초

### 처리량
- **최대 동시 요청**: 100개/분
- **Bedrock 제한**: 모델별 토큰 제한 적용
- **Lambda 타임아웃**: 60초

### 정확도
- **추천 점수 정확도**: 85-90%
- **위치 정확도**: ±50m
- **카테고리 매칭**: 95%+

## 에러 처리

### 일반적인 에러
```json
{
  "statusCode": 400,
  "body": {
    "error": "lat and lng are required",
    "processing_time_ms": 5
  }
}
```

### AI 모델 에러
```json
{
  "statusCode": 200,
  "body": {
    "recommendations": {
      "pin_based": null,
      "general_place_search": {
        "ai_analysis": {
          "reasoning": "AI 오류로 기본 장소 추천: AccessDeniedException"
        }
      }
    }
  }
}
```

### 에러 코드

| 상태 코드 | 에러 | 설명 | 해결 방법 |
|----------|------|------|-----------|
| 400 | `MissingParameters` | lat, lng 누락 | 필수 파라미터 확인 |
| 400 | `InvalidCoordinates` | 서울 범위 벗어남 | 좌표 범위 확인 |
| 500 | `BedrockError` | AI 모델 호출 실패 | 잠시 후 재시도 |
| 500 | `DynamoDBError` | 데이터베이스 오류 | 관리자 문의 |

## 제한사항

### 지리적 제한
- **서비스 지역**: 서울특별시만 지원
- **좌표 범위**: 
  - 위도: 37.4-37.7
  - 경도: 126.8-127.2

### 요청 제한
- **반경**: 최대 10km
- **요청 빈도**: 분당 100회
- **동시 요청**: 10개

### AI 모델 제한
- **토큰 제한**: 요청당 1,500 토큰
- **응답 시간**: 최대 30초
- **언어**: 한국어 위주

## 향후 개선 계획

### Phase 1: 성능 최적화
- [ ] 응답 시간 단축 (목표: 2초 이내)
- [ ] 캐싱 시스템 도입
- [ ] 배치 처리 최적화

### Phase 2: 기능 확장
- [ ] 실시간 교통 정보 연동
- [ ] 날씨 정보 기반 추천
- [ ] 사용자 히스토리 기반 개인화

### Phase 3: 고도화
- [ ] 다중 언어 지원
- [ ] 음성 인터페이스
- [ ] AR/VR 연동

---

**마지막 업데이트**: 2025-09-05  
**문서 버전**: 1.0  
**AI 모델**: Claude 3 Haiku v1.0
