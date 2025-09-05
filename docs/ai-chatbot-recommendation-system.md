# 🤖 AI 챗봇 기반 장소 추천 시스템 설계

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [아키텍처 설계](#아키텍처-설계)
3. [API 설계](#api-설계)
4. [데이터 플로우](#데이터-플로우)
5. [세션 관리 전략](#세션-관리-전략)
6. [AI 추천 로직](#ai-추천-로직)
7. [서버리스 구성 요소](#서버리스-구성-요소)
8. [보안 및 성능](#보안-및-성능)
9. [구현 단계](#구현-단계)
10. [비용 분석](#비용-분석)

---

## 시스템 개요

### 🎯 **핵심 목표**
사용자가 자연어로 원하는 장소의 특성을 설명하면, AI가 기존 spots 데이터를 분석하여 개인화된 장소를 추천하는 대화형 시스템

### 🔍 **주요 기능**
- **자연어 이해**: 사용자의 모호한 요구사항을 구체적인 조건으로 변환
- **컨텍스트 유지**: 대화 세션을 통한 점진적 요구사항 정제
- **지능형 매칭**: AI 기반 spots 데이터 분석 및 유사도 계산
- **개인화 추천**: 사용자 선호도 학습 및 맞춤형 결과 제공

### 💬 **사용자 시나리오**
```
사용자: "조용하고 와이파이가 좋은 카페를 찾고 있어요"
챗봇: "어떤 지역을 선호하시나요? 혼자 작업하시는 건가요?"
사용자: "강남 근처에서 노트북 작업하기 좋은 곳이요"
챗봇: "강남역 근처 3곳을 추천드려요. 각각의 특징은..."
```

---

## 아키텍처 설계

### 🏗️ **전체 시스템 아키텍처**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │───▶│   API Gateway    │───▶│   Lambda        │
│   (Frontend)    │    │   (REST API)     │    │   (Chat Logic)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌──────────────────┐             │
                       │   DynamoDB       │◀────────────┘
                       │   (Sessions)     │
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   DynamoDB       │
                       │   (Spots Data)   │
                       └──────────────────┘
                                │
                       ┌──────────────────┐
                       │   Amazon Bedrock │
                       │   (Claude 3)     │
                       └──────────────────┘
```

### 🔄 **상세 데이터 플로우**

```
1. 사용자 메시지 입력
   ↓
2. API Gateway → Lambda (Chat Handler)
   ↓
3. 세션 조회/생성 (DynamoDB Sessions)
   ↓
4. 메시지 컨텍스트 분석 (Bedrock)
   ↓
5. Spots 데이터 검색 (DynamoDB Spots)
   ↓
6. AI 기반 매칭 및 추천 (Bedrock)
   ↓
7. 세션 상태 업데이트
   ↓
8. 추천 결과 반환
```

---

## API 설계

### 🌐 **RESTful API 엔드포인트**

#### **1. 채팅 세션 관리**

```http
POST /api/v1/chat/sessions
Content-Type: application/json

{
  "userId": "user-123",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "location": {
      "lat": 37.5665,
      "lng": 126.9780
    }
  }
}

Response:
{
  "sessionId": "sess-abc123",
  "expiresAt": "2025-09-06T00:00:00Z",
  "status": "active"
}
```

#### **2. 메시지 전송 및 응답**

```http
POST /api/v1/chat/sessions/{sessionId}/messages
Content-Type: application/json

{
  "message": "조용하고 와이파이가 좋은 카페를 찾고 있어요",
  "messageType": "text",
  "timestamp": "2025-09-05T23:12:00Z"
}

Response:
{
  "messageId": "msg-xyz789",
  "response": {
    "text": "어떤 지역을 선호하시나요? 혼자 작업하시는 건가요?",
    "type": "clarification",
    "suggestions": [
      "강남 지역",
      "홍대 지역", 
      "상관없음"
    ]
  },
  "context": {
    "extractedPreferences": {
      "atmosphere": "quiet",
      "amenities": ["wifi"],
      "purpose": "work"
    },
    "conversationStage": "preference_gathering"
  },
  "recommendations": null
}
```

#### **3. 추천 결과 조회**

```http
GET /api/v1/chat/sessions/{sessionId}/recommendations

Response:
{
  "recommendations": [
    {
      "spotId": "spot-001",
      "name": "조용한 카페 A",
      "score": 0.95,
      "matchReasons": [
        "매우 조용한 환경 (소음 레벨: 낮음)",
        "고속 와이파이 제공",
        "노트북 작업 공간 충분"
      ],
      "location": {
        "address": "서울시 강남구...",
        "distance": "500m"
      }
    }
  ],
  "totalCount": 3,
  "searchCriteria": {
    "atmosphere": "quiet",
    "amenities": ["wifi"],
    "location": "gangnam"
  }
}
```

#### **4. 세션 상태 관리**

```http
GET /api/v1/chat/sessions/{sessionId}
PUT /api/v1/chat/sessions/{sessionId}
DELETE /api/v1/chat/sessions/{sessionId}
```

---

## 데이터 플로우

### 📊 **세션 데이터 구조**

```json
{
  "sessionId": "sess-abc123",
  "userId": "user-123",
  "status": "active",
  "createdAt": "2025-09-05T23:00:00Z",
  "updatedAt": "2025-09-05T23:12:00Z",
  "expiresAt": "2025-09-06T23:00:00Z",
  "context": {
    "conversationHistory": [
      {
        "role": "user",
        "content": "조용한 카페 찾아줘",
        "timestamp": "2025-09-05T23:10:00Z"
      },
      {
        "role": "assistant", 
        "content": "어떤 지역을 선호하시나요?",
        "timestamp": "2025-09-05T23:10:05Z"
      }
    ],
    "extractedPreferences": {
      "atmosphere": ["quiet"],
      "amenities": ["wifi"],
      "location": null,
      "purpose": "work",
      "groupSize": 1,
      "timePreference": null,
      "priceRange": null
    },
    "conversationStage": "preference_gathering",
    "lastRecommendations": ["spot-001", "spot-002"],
    "userFeedback": []
  },
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "initialLocation": {
      "lat": 37.5665,
      "lng": 126.9780
    },
    "deviceType": "desktop"
  }
}
```

### 🎯 **Spots 데이터 확장**

```json
{
  "spotId": "spot-001",
  "name": "조용한 카페 A",
  "category": "cafe",
  "location": {
    "address": "서울시 강남구 테헤란로 123",
    "coordinates": {
      "lat": 37.5665,
      "lng": 126.9780
    },
    "district": "gangnam",
    "nearbyStations": ["강남역", "역삼역"]
  },
  "attributes": {
    "atmosphere": {
      "noiseLevel": "low",
      "crowdLevel": "medium", 
      "ambiance": ["cozy", "modern"]
    },
    "amenities": {
      "wifi": {
        "available": true,
        "speed": "high",
        "password": "free"
      },
      "power": {
        "outlets": "many",
        "locations": ["tables", "counter"]
      },
      "workspace": {
        "laptopFriendly": true,
        "tableSize": "large",
        "seatingTypes": ["chair", "sofa"]
      }
    },
    "operational": {
      "hours": {
        "weekday": "07:00-22:00",
        "weekend": "08:00-21:00"
      },
      "priceRange": "medium",
      "reservationRequired": false
    }
  },
  "aiMetadata": {
    "embeddingVector": [0.1, 0.2, ...], // AI 유사도 계산용
    "tags": ["quiet", "wifi", "workspace", "modern"],
    "description": "조용하고 현대적인 분위기의 카페로 노트북 작업에 최적화된 환경을 제공합니다."
  },
  "userFeedback": {
    "ratings": {
      "overall": 4.5,
      "quietness": 4.8,
      "wifi": 4.6,
      "workspace": 4.4
    },
    "reviews": [...]
  }
}
```

---

## 세션 관리 전략

### 🔐 **세션 생명주기**

#### **1. 세션 생성**
```
사용자 접속 → 임시 세션 ID 생성 → DynamoDB 저장
- TTL: 24시간 (자동 만료)
- 상태: 'active', 'expired', 'completed'
```

#### **2. 세션 유지**
```
메시지 교환 → 세션 업데이트 → TTL 연장
- 활성 상태 확인
- 컨텍스트 누적 저장
- 대화 히스토리 관리
```

#### **3. 세션 종료**
```
사용자 만족 → 추천 완료 → 세션 'completed'
시간 만료 → 자동 삭제 → 정리 작업
```

### 💾 **DynamoDB 테이블 설계**

#### **Sessions 테이블**
```
Primary Key: sessionId (String)
Attributes:
- userId (String, GSI)
- status (String)
- createdAt (Number, TTL)
- updatedAt (Number)
- expiresAt (Number, TTL)
- context (Map)
- metadata (Map)

GSI: userId-createdAt-index
TTL: expiresAt 필드 기반 자동 삭제
```

#### **ChatMessages 테이블**
```
Primary Key: sessionId (String)
Sort Key: timestamp (Number)
Attributes:
- messageId (String)
- role (String) // 'user' | 'assistant'
- content (String)
- messageType (String)
- metadata (Map)

TTL: 7일 후 자동 삭제
```

---

## AI 추천 로직

### 🧠 **Amazon Bedrock 활용 전략**

#### **1. 자연어 이해 (NLU)**
```python
# Prompt Template
system_prompt = """
당신은 장소 추천 전문가입니다. 사용자의 요청을 분석하여 다음 JSON 형식으로 추출하세요:

{
  "preferences": {
    "atmosphere": ["quiet", "lively", "cozy"],
    "amenities": ["wifi", "power", "parking"],
    "location": "gangnam|hongdae|itaewon|null",
    "purpose": "work|meeting|date|study",
    "groupSize": number,
    "timePreference": "morning|afternoon|evening|null",
    "priceRange": "low|medium|high|null"
  },
  "clarificationNeeded": boolean,
  "nextQuestion": "string|null"
}
"""

user_message = "조용하고 와이파이가 좋은 카페를 찾고 있어요"
```

#### **2. 컨텍스트 기반 대화 관리**
```python
conversation_prompt = """
대화 히스토리:
{conversation_history}

현재 추출된 선호도:
{current_preferences}

사용자 메시지: {user_message}

다음 중 하나를 선택하세요:
1. 더 많은 정보가 필요하면 질문을 생성
2. 충분한 정보가 있으면 추천 진행
"""
```

#### **3. 스팟 매칭 및 점수 계산**
```python
matching_prompt = """
사용자 선호도:
{user_preferences}

후보 장소들:
{candidate_spots}

각 장소에 대해 0-1 점수와 매칭 이유를 제공하세요:
{
  "recommendations": [
    {
      "spotId": "spot-001",
      "score": 0.95,
      "matchReasons": ["이유1", "이유2"],
      "concerns": ["우려사항1"]
    }
  ]
}
"""
```

### 🎯 **추천 알고리즘 플로우**

```
1. 사용자 메시지 분석
   ↓
2. 선호도 추출 및 업데이트
   ↓
3. 필요 정보 부족 시 → 질문 생성
   ↓
4. 충분한 정보 확보 시 → 후보 스팟 검색
   ↓
5. AI 기반 매칭 점수 계산
   ↓
6. 상위 3-5개 추천 결과 반환
   ↓
7. 사용자 피드백 수집 및 학습
```

---

## 서버리스 구성 요소

### ⚡ **Lambda 함수 설계**

#### **1. Chat Handler Lambda**
```
Function: chat-handler
Runtime: Python 3.11
Memory: 512MB
Timeout: 30s
Environment Variables:
- BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
- SESSIONS_TABLE=ChatSessions
- SPOTS_TABLE=Spots
```

**주요 책임:**
- 메시지 라우팅 및 세션 관리
- Bedrock API 호출 및 응답 처리
- DynamoDB 읽기/쓰기 작업

#### **2. Recommendation Engine Lambda**
```
Function: recommendation-engine  
Runtime: Python 3.11
Memory: 1024MB
Timeout: 60s
```

**주요 책임:**
- 복잡한 스팟 검색 및 필터링
- 벡터 유사도 계산
- 추천 결과 랭킹 및 정렬

#### **3. Session Cleanup Lambda**
```
Function: session-cleanup
Runtime: Python 3.11
Memory: 256MB
Timeout: 15s
Trigger: CloudWatch Events (매일 자정)
```

**주요 책임:**
- 만료된 세션 정리
- 로그 데이터 아카이빙
- 성능 메트릭 수집

### 🔗 **API Gateway 설정**

```yaml
Resources:
  ChatAPI:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: ShitPlace-Chat-API
      EndpointConfiguration:
        Types: [REGIONAL]
      
  ChatResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref ChatAPI
      ParentId: !GetAtt ChatAPI.RootResourceId
      PathPart: chat
      
  SessionsResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref ChatAPI
      ParentId: !Ref ChatResource
      PathPart: sessions
```

### 📊 **DynamoDB 최적화**

#### **읽기/쓰기 용량 설정**
```
Sessions Table:
- On-Demand Billing (예측 불가능한 트래픽)
- Point-in-time Recovery 활성화
- Encryption at Rest

Spots Table:
- Provisioned: 5 RCU, 2 WCU (읽기 중심)
- Global Secondary Index: location-based queries
```

---

## 보안 및 성능

### 🔒 **보안 고려사항**

#### **1. 인증 및 권한**
```
- API Gateway에서 API Key 또는 Cognito 인증
- Lambda 실행 역할 최소 권한 원칙
- VPC 내부 통신 (필요시)
```

#### **2. 데이터 보호**
```
- DynamoDB 암호화 (KMS)
- 세션 데이터 개인정보 최소화
- 로그에서 민감 정보 제외
```

#### **3. Rate Limiting**
```
- API Gateway Usage Plans
- 사용자별 요청 제한 (100 req/min)
- DDoS 방지 및 비용 제어
```

### ⚡ **성능 최적화**

#### **1. 응답 시간 최적화**
```
- Lambda Cold Start 최소화 (Provisioned Concurrency)
- DynamoDB 쿼리 최적화 (적절한 인덱스)
- Bedrock 응답 스트리밍 (긴 응답 시)
```

#### **2. 캐싱 전략**
```
- API Gateway 캐싱 (스팟 데이터)
- Lambda 메모리 내 캐싱 (자주 사용되는 데이터)
- ElastiCache (필요시 세션 캐싱)
```

#### **3. 모니터링**
```
- CloudWatch 메트릭 및 알람
- X-Ray 분산 추적
- 사용자 경험 메트릭 수집
```

---

## 구현 단계

### 📅 **Phase 1: 기본 채팅 시스템 (1주)**

#### **목표**
- 기본적인 메시지 송수신 기능
- 세션 관리 구현
- 간단한 Bedrock 연동

#### **구현 항목**
```
✅ DynamoDB 테이블 생성
✅ Lambda 함수 기본 구조
✅ API Gateway 엔드포인트
✅ 프론트엔드 채팅 UI
✅ 기본 세션 관리
```

#### **성공 기준**
- 사용자가 메시지를 보내고 AI 응답을 받을 수 있음
- 세션이 정상적으로 생성/관리됨

### 📅 **Phase 2: 지능형 추천 시스템 (1주)**

#### **목표**
- 자연어 이해 및 선호도 추출
- 스팟 데이터와 매칭 로직
- 추천 결과 생성

#### **구현 항목**
```
✅ Bedrock 프롬프트 엔지니어링
✅ 스팟 데이터 구조 확장
✅ 매칭 알고리즘 구현
✅ 추천 결과 UI
```

#### **성공 기준**
- AI가 사용자 요구사항을 정확히 이해함
- 관련성 높은 장소 추천 제공

### 📅 **Phase 3: 고도화 및 최적화 (1주)**

#### **목표**
- 성능 최적화 및 사용자 경험 개선
- 피드백 시스템 구현
- 모니터링 및 로깅

#### **구현 항목**
```
✅ 응답 시간 최적화
✅ 사용자 피드백 수집
✅ 추천 정확도 개선
✅ 모니터링 대시보드
```

---

## 비용 분석

### 💰 **월간 예상 비용 (1000 사용자 기준)**

#### **AWS 서비스별 비용**
```
Lambda (Chat Handler):
- 요청: 50,000회/월
- 실행 시간: 평균 5초
- 비용: $0.50

DynamoDB:
- Sessions: On-Demand, 10GB
- Messages: On-Demand, 5GB  
- 비용: $3.75

Amazon Bedrock:
- Claude 3 Haiku: 1M 토큰/월
- 비용: $0.25

API Gateway:
- 요청: 50,000회/월
- 비용: $0.18

총 예상 비용: ~$4.68/월
```

#### **비용 최적화 방안**
```
1. Lambda 실행 시간 최적화
2. DynamoDB 쿼리 효율성 개선
3. Bedrock 토큰 사용량 최소화
4. 적절한 캐싱 전략 적용
```

### 📊 **확장성 고려사항**

#### **트래픽 증가 시나리오**
```
10배 증가 (10,000 사용자):
- Lambda: $5.00
- DynamoDB: $37.50  
- Bedrock: $2.50
- API Gateway: $1.80
총 비용: ~$46.80/월

100배 증가 (100,000 사용자):
- 예상 비용: ~$468/월
- 추가 최적화 필요 (캐싱, 배치 처리)
```

---

## 기술적 고려사항

### 🔧 **Bedrock 모델 선택**

#### **Claude 3 Haiku vs Sonnet vs Opus**
```
Haiku (권장):
- 빠른 응답 속도 (< 3초)
- 저렴한 비용
- 충분한 이해 능력

Sonnet:
- 더 정확한 분석
- 중간 비용
- 복잡한 요구사항 처리

Opus:
- 최고 성능
- 높은 비용
- 고급 추론 능력
```

### 🎯 **프롬프트 엔지니어링 전략**

#### **Few-Shot Learning 예시**
```python
examples = [
    {
        "input": "조용한 곳에서 공부하고 싶어요",
        "output": {
            "preferences": {
                "atmosphere": ["quiet"],
                "purpose": "study"
            },
            "clarificationNeeded": true,
            "nextQuestion": "어떤 지역을 선호하시나요?"
        }
    }
]
```

#### **Chain-of-Thought 추론**
```
1. 사용자 의도 파악
2. 명시적/암시적 요구사항 분리  
3. 부족한 정보 식별
4. 적절한 질문 생성
5. 추천 로직 실행
```

### 🔄 **에러 처리 및 복구**

#### **Graceful Degradation**
```
Bedrock 장애 시:
→ 기본 키워드 매칭으로 폴백
→ 사전 정의된 추천 목록 제공

DynamoDB 장애 시:
→ 메모리 내 임시 세션 관리
→ 복구 후 데이터 동기화

API Gateway 장애 시:
→ 클라이언트 재시도 로직
→ 사용자 친화적 오류 메시지
```

---

## 결론 및 다음 단계

### 🎯 **핵심 성공 요소**

1. **사용자 경험**: 자연스러운 대화 플로우
2. **추천 정확도**: 실제 사용자 요구에 맞는 결과
3. **응답 속도**: 3초 이내 응답 목표
4. **확장성**: 사용자 증가에 대응 가능한 구조

### 🚀 **구현 우선순위**

1. **MVP 개발**: 기본 채팅 + 간단한 추천
2. **AI 고도화**: 정확한 의도 파악 및 매칭
3. **UX 개선**: 직관적인 인터페이스
4. **성능 최적화**: 응답 시간 및 비용 효율성

### 📈 **향후 확장 계획**

- **다국어 지원**: 영어, 일본어 추가
- **음성 인터페이스**: 음성 입력/출력 지원
- **개인화 강화**: 사용자 행동 패턴 학습
- **실시간 정보**: 현재 혼잡도, 대기시간 등

---

**문서 작성일**: 2025-09-05  
**작성자**: AWS 해커톤 Team 22  
**버전**: 1.0.0  
**다음 리뷰**: Phase 1 완료 후
