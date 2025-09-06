# 🤫 쉿플레이스 - 시스템 아키텍처 다이어그램

## 📊 전체 시스템 아키텍처

```mermaid
graph TB
    %% 사용자 레이어
    subgraph "👥 사용자 인터페이스"
        USER[사용자]
        BROWSER[웹 브라우저]
    end

    %% CDN 및 정적 호스팅
    subgraph "🌐 CDN & 정적 호스팅"
        CF[CloudFront CDN]
        S3[S3 정적 호스팅]
    end

    %% 프론트엔드 애플리케이션
    subgraph "⚛️ React 프론트엔드"
        APP[App.tsx]
        MAP[Map 컴포넌트]
        CHAT[ChatBot 컴포넌트]
        AUTH[인증 모달]
        PIN[핀 등록 모달]
    end

    %% API 레이어
    subgraph "🔌 API 클라이언트"
        SPOTS_API[Spots API]
        POP_API[Population API]
        KAKAO_API[Kakao Directions API]
        QUIET_API[Quiet Route API]
        AUTH_API[Auth API]
        CHAT_API[Chat API]
        IMG_API[Image API]
    end

    %% AWS API Gateway
    subgraph "🚪 AWS API Gateway"
        AGW_SPOTS[Spots Gateway<br/>xx42krmzqc]
        AGW_POP[Population Gateway<br/>48hywqoyra]
        AGW_AUTH[Auth Gateway<br/>phkrt740aa]
        AGW_IMG[Images Gateway<br/>2atoqsmedi]
    end

    %% Lambda 함수들
    subgraph "⚡ AWS Lambda Functions"
        L_SPOTS[getSpots.js]
        L_DELETE[deleteSpot.js]
        L_POP_COLLECT[realtimePopulationCollector]
        L_POP_API[realtimePopulationAPI]
        L_AUTH[auth-handler.py]
        L_CHAT[chat-handler.py]
        L_IMG[direct-image-upload.py]
        L_REC[recommendation-engine.py]
        L_CLEANUP[session-cleanup.py]
    end

    %% 데이터베이스
    subgraph "🗄️ 데이터 저장소"
        DDB_SPOTS[DynamoDB<br/>SpotsTable]
        DDB_POP[DynamoDB<br/>RealtimePopulationData]
        DDB_AUTH[DynamoDB<br/>UserSessions]
        S3_IMG[S3<br/>이미지 저장소]
    end

    %% 외부 서비스
    subgraph "🌍 외부 서비스"
        KAKAO_EXT[카카오 모빌리티 API]
        SEOUL_API[서울시 실시간 인구 API]
        BEDROCK[Amazon Bedrock<br/>Claude 3 Haiku]
    end

    %% 스케줄링
    subgraph "⏰ 스케줄링"
        EB[EventBridge<br/>매시간 실행]
    end

    %% 연결 관계
    USER --> BROWSER
    BROWSER --> CF
    CF --> S3
    S3 --> APP
    
    APP --> MAP
    APP --> CHAT
    APP --> AUTH
    APP --> PIN
    
    MAP --> SPOTS_API
    MAP --> POP_API
    MAP --> KAKAO_API
    MAP --> QUIET_API
    
    CHAT --> CHAT_API
    AUTH --> AUTH_API
    PIN --> IMG_API
    
    SPOTS_API --> AGW_SPOTS
    POP_API --> AGW_POP
    AUTH_API --> AGW_AUTH
    IMG_API --> AGW_IMG
    
    AGW_SPOTS --> L_SPOTS
    AGW_SPOTS --> L_DELETE
    AGW_POP --> L_POP_API
    AGW_AUTH --> L_AUTH
    AGW_IMG --> L_IMG
    AGW_SPOTS --> L_CHAT
    AGW_SPOTS --> L_REC
    
    L_SPOTS --> DDB_SPOTS
    L_DELETE --> DDB_SPOTS
    L_POP_API --> DDB_POP
    L_POP_COLLECT --> DDB_POP
    L_AUTH --> DDB_AUTH
    L_IMG --> S3_IMG
    L_CHAT --> BEDROCK
    L_REC --> DDB_SPOTS
    L_CLEANUP --> DDB_AUTH
    
    EB --> L_POP_COLLECT
    L_POP_COLLECT --> SEOUL_API
    
    KAKAO_API --> KAKAO_EXT
    QUIET_API --> KAKAO_API
    QUIET_API --> POP_API

    %% 스타일링
    classDef frontend fill:#e1f5fe
    classDef api fill:#f3e5f5
    classDef lambda fill:#fff3e0
    classDef database fill:#e8f5e8
    classDef external fill:#fce4ec
    
    class APP,MAP,CHAT,AUTH,PIN frontend
    class SPOTS_API,POP_API,KAKAO_API,QUIET_API,AUTH_API,CHAT_API,IMG_API api
    class L_SPOTS,L_DELETE,L_POP_COLLECT,L_POP_API,L_AUTH,L_CHAT,L_IMG,L_REC,L_CLEANUP lambda
    class DDB_SPOTS,DDB_POP,DDB_AUTH,S3_IMG database
    class KAKAO_EXT,SEOUL_API,BEDROCK external
```

## 🏗️ 컴포넌트별 상세 아키텍처

### 1. 프론트엔드 컴포넌트 구조

```mermaid
graph TB
    subgraph "⚛️ React 애플리케이션"
        APP[App.tsx<br/>메인 애플리케이션]
        
        subgraph "🗺️ 지도 관련"
            MAP[Map.tsx<br/>카카오맵 통합]
            PIN_MODAL[PinRegistrationModal.tsx<br/>장소 등록]
            LOC_BTN[LocationButton.tsx<br/>현재 위치]
            PLACE_POP[PlacePopulation.tsx<br/>인구 데이터 표시]
        end
        
        subgraph "💬 채팅 & 인증"
            CHAT[ChatBot.tsx<br/>AI 챗봇]
            LOGIN[LoginModal.tsx<br/>로그인]
            AUTH_CTX[AuthContext<br/>인증 상태 관리]
        end
        
        subgraph "🎨 UI 컴포넌트"
            TOP_BAR[TopBar.tsx<br/>상단 바]
            FLOAT_LIST[FloatingPlaceList.tsx<br/>장소 목록]
            ALERT[Alert.tsx<br/>알림]
            LOADING[Loading.tsx<br/>로딩]
        end
    end
    
    APP --> MAP
    APP --> CHAT
    APP --> LOGIN
    APP --> TOP_BAR
    
    MAP --> PIN_MODAL
    MAP --> LOC_BTN
    MAP --> PLACE_POP
    MAP --> FLOAT_LIST
    
    CHAT --> AUTH_CTX
    LOGIN --> AUTH_CTX
    
    MAP --> ALERT
    PIN_MODAL --> LOADING
```

### 2. API 클라이언트 구조

```mermaid
graph TB
    subgraph "🔌 API 클라이언트 레이어"
        CONFIG[config.ts<br/>API 설정 & Axios 인스턴스]
        
        subgraph "📍 장소 관련 API"
            SPOTS[spots.ts<br/>장소 CRUD]
            COMMENTS[comments.ts<br/>댓글 관리]
            IMAGES[images.ts<br/>이미지 업로드]
        end
        
        subgraph "🗺️ 지도 & 경로 API"
            KAKAO[kakao-directions.ts<br/>카카오 길찾기]
            QUIET[quiet-route.ts<br/>조용한 경로]
            POP[population.ts<br/>실시간 인구]
        end
        
        subgraph "🤖 AI & 인증 API"
            CHAT_API[chatbot.ts<br/>AI 챗봇]
            AUTH_API[auth.ts<br/>사용자 인증]
        end
        
        subgraph "📊 데이터 모델"
            MODELS[models/<br/>TypeScript 타입 정의]
        end
    end
    
    CONFIG --> SPOTS
    CONFIG --> COMMENTS
    CONFIG --> IMAGES
    CONFIG --> KAKAO
    CONFIG --> QUIET
    CONFIG --> POP
    CONFIG --> CHAT_API
    CONFIG --> AUTH_API
    
    QUIET --> KAKAO
    QUIET --> POP
    
    SPOTS --> MODELS
    POP --> MODELS
    KAKAO --> MODELS
```

### 3. AWS Lambda 함수 구조

```mermaid
graph TB
    subgraph "⚡ Lambda Functions"
        subgraph "📍 장소 관리"
            GET_SPOTS[getSpots.js<br/>장소 조회 & 필터링]
            DEL_SPOT[deleteSpot.js<br/>장소 삭제]
        end
        
        subgraph "📊 인구 데이터"
            POP_COLLECT[realtimePopulationCollector<br/>서울시 API 수집]
            POP_API[realtimePopulationAPI<br/>인구 데이터 제공]
        end
        
        subgraph "🤖 AI & 추천"
            CHAT_HANDLER[chat-handler.py<br/>Bedrock 챗봇]
            REC_ENGINE[recommendation-engine.py<br/>장소 추천 엔진]
        end
        
        subgraph "👤 사용자 관리"
            AUTH_HANDLER[auth-handler.py<br/>인증 처리]
            SESSION_CLEANUP[session-cleanup.py<br/>세션 정리]
        end
        
        subgraph "🖼️ 미디어"
            IMG_UPLOAD[direct-image-upload.py<br/>이미지 업로드]
        end
    end
    
    GET_SPOTS --> DDB_SPOTS[(DynamoDB<br/>SpotsTable)]
    DEL_SPOT --> DDB_SPOTS
    
    POP_COLLECT --> SEOUL[(서울시 API)]
    POP_COLLECT --> DDB_POP[(DynamoDB<br/>PopulationData)]
    POP_API --> DDB_POP
    
    CHAT_HANDLER --> BEDROCK[(Amazon Bedrock)]
    REC_ENGINE --> DDB_SPOTS
    
    AUTH_HANDLER --> DDB_AUTH[(DynamoDB<br/>UserSessions)]
    SESSION_CLEANUP --> DDB_AUTH
    
    IMG_UPLOAD --> S3_IMG[(S3<br/>Images)]
```

### 4. 데이터 플로우

```mermaid
sequenceDiagram
    participant U as 사용자
    participant F as 프론트엔드
    participant A as API Gateway
    participant L as Lambda
    participant D as DynamoDB
    participant K as 카카오 API
    participant S as 서울시 API
    
    Note over U,S: 1. 장소 조회 플로우
    U->>F: 지도 로드
    F->>A: GET /spots
    A->>L: getSpots 실행
    L->>D: 장소 데이터 조회
    D-->>L: 장소 목록 반환
    L-->>A: 응답 데이터
    A-->>F: JSON 응답
    F-->>U: 지도에 마커 표시
    
    Note over U,S: 2. 경로 탐색 플로우
    U->>F: 출발지/도착지 설정
    F->>K: 경로 요청
    K-->>F: 기본 경로 데이터
    F->>A: GET /realtime-population
    A->>L: 인구 데이터 조회
    L->>D: 실시간 인구 조회
    D-->>L: 인구 데이터
    L-->>A: 인구 정보
    A-->>F: 혼잡도 데이터
    F-->>U: 조용한 경로 표시
    
    Note over U,S: 3. 데이터 수집 (백그라운드)
    Note over L: EventBridge 트리거
    L->>S: 실시간 인구 API 호출
    S-->>L: 인구 데이터
    L->>D: 데이터 저장
```

## 🔧 기술 스택 요약

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Map**: Kakao Maps API
- **HTTP Client**: Axios
- **State Management**: React Context

### Backend
- **API Gateway**: AWS API Gateway (REST)
- **Compute**: AWS Lambda (Node.js 18, Python 3.9)
- **Database**: DynamoDB
- **Storage**: S3
- **CDN**: CloudFront
- **AI**: Amazon Bedrock (Claude 3 Haiku)
- **Scheduling**: EventBridge

### External APIs
- **Kakao Mobility API**: 실시간 길찾기
- **서울시 열린데이터 광장**: 실시간 인구 데이터

### Infrastructure
- **IaC**: Terraform
- **Deployment**: Shell Scripts + AWS CLI
- **Monitoring**: CloudWatch

## 📈 확장성 고려사항

1. **수평 확장**: Lambda 자동 스케일링
2. **캐싱**: CloudFront + DynamoDB DAX (향후)
3. **모니터링**: CloudWatch + X-Ray (향후)
4. **보안**: API Gateway 인증 + CORS
5. **성능**: 지역별 데이터 파티셔닝 (향후)
