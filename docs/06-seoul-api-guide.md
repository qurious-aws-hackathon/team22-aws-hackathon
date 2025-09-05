# 서울시 열린데이터광장 API 가이드 (FE 개발자용)

## 🌟 개요

서울시 열린데이터광장에서 제공하는 실시간 도시 데이터를 활용하여 인구밀집도, 교통정보, 생활편의 데이터를 가져오는 방법을 안내합니다.

## 🔑 API 키 발급

### 1. 회원가입 및 로그인
- **사이트**: https://data.seoul.go.kr
- 회원가입 후 로그인

### 2. API 키 신청
1. **마이페이지** → **인증키 관리**
2. **인증키 신청** 클릭
3. **실시간 도시데이터** 카테고리 선택
4. 신청 사유 작성 후 제출
5. **즉시 승인** (보통 1-2분 내)

### 3. API 키 확인
```
예시: 475268626864726934334652674c4a
```

## 📊 주요 API 목록

### 1. 실시간 생활인구 (SPOP_LOCAL_RESD_DONG)

**용도**: 서울시 동별 실시간 인구 현황

```javascript
// API URL
const API_URL = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/SPOP_LOCAL_RESD_DONG/1/100/`;

// 호출 예시
const fetchPopulationData = async () => {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    return data.SPOP_LOCAL_RESD_DONG.row;
  } catch (error) {
    console.error('API 호출 실패:', error);
  }
};
```

**응답 데이터 구조**:
```json
{
  "SPOP_LOCAL_RESD_DONG": {
    "list_total_count": 424,
    "RESULT": {
      "CODE": "INFO-000",
      "MESSAGE": "정상 처리되었습니다"
    },
    "row": [
      {
        "AREA_NM": "종로구 청운효자동",
        "AREA_CD": "1111051500", 
        "LIVE_PPLTN_STTS": "1234",
        "PPLTN_TIME": "2025090514",
        "X_COORD": "126.9658",
        "Y_COORD": "37.5834"
      }
    ]
  }
}
```

**주요 필드**:
- `AREA_NM`: 지역명 (구 + 동)
- `LIVE_PPLTN_STTS`: 실시간 생활인구 수
- `X_COORD`, `Y_COORD`: 경도, 위도
- `PPLTN_TIME`: 데이터 수집 시간

### 2. 지하철 승하차 인원 (CARD_SUBWAY_STTS)

**용도**: 지하철역별 실시간 승하차 인원

```javascript
const API_URL = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/CARD_SUBWAY_STTS/1/100/`;

const fetchSubwayData = async () => {
  const response = await fetch(API_URL);
  const data = await response.json();
  return data.CARD_SUBWAY_STTS.row;
};
```

**응답 데이터**:
```json
{
  "SUBWAY_STATN_NM": "강남역",
  "GTON_TNOPE": "15234",
  "GTOFF_TNOPE": "14567", 
  "USE_DT": "20250905",
  "ONE_HOUR_SLOT": "14"
}
```

### 3. 버스 승하차 인원 (CARD_BUS_STTS)

**용도**: 버스 정류장별 승하차 인원

```javascript
const API_URL = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/CARD_BUS_STTS/1/100/`;
```

### 4. 실시간 교통정보 (TrafficInfo)

**용도**: 도로별 교통 상황 (소음도 추정용)

```javascript
const API_URL = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/TrafficInfo/1/100/`;
```

## 🛠️ 프론트엔드 통합 가이드

### React 컴포넌트 예시

```javascript
// services/seoulAPI.js
class SeoulDataService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'http://openapi.seoul.go.kr:8088';
  }

  async getPopulationData() {
    const url = `${this.baseURL}/${this.apiKey}/json/SPOP_LOCAL_RESD_DONG/1/100/`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.SPOP_LOCAL_RESD_DONG?.RESULT?.CODE === 'INFO-000') {
        return this.transformPopulationData(data.SPOP_LOCAL_RESD_DONG.row);
      }
      throw new Error('API 응답 오류');
    } catch (error) {
      console.error('서울 API 호출 실패:', error);
      return [];
    }
  }

  transformPopulationData(rawData) {
    return rawData.map((item, index) => ({
      id: `seoul_${index + 1}`,
      name: item.AREA_NM,
      population: parseInt(item.LIVE_PPLTN_STTS || 0),
      latitude: parseFloat(item.Y_COORD),
      longitude: parseFloat(item.X_COORD),
      updateTime: item.PPLTN_TIME,
      crowdLevel: this.calculateCrowdLevel(parseInt(item.LIVE_PPLTN_STTS || 0))
    }));
  }

  calculateCrowdLevel(population) {
    if (population < 3000) return 0; // 한적함
    if (population < 8000) return 1; // 보통
    return 2; // 혼잡
  }
}

// React Hook 사용 예시
import { useState, useEffect } from 'react';

const useSeoulPopulationData = (apiKey) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const service = new SeoulDataService(apiKey);
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const populationData = await service.getPopulationData();
        setData(populationData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // 10분마다 데이터 갱신
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiKey]);

  return { data, loading, error };
};

// 컴포넌트에서 사용
const PopulationMap = () => {
  const { data, loading, error } = useSeoulPopulationData('YOUR_API_KEY');

  if (loading) return <div>데이터 로딩 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return (
    <div>
      {data.map(place => (
        <div key={place.id}>
          <h3>{place.name}</h3>
          <p>인구: {place.population}명</p>
          <p>혼잡도: {['한적함', '보통', '혼잡'][place.crowdLevel]}</p>
        </div>
      ))}
    </div>
  );
};
```

## 🚨 CORS 문제 해결

### 문제
브라우저에서 직접 서울 API 호출시 CORS 오류 발생

### 해결방법

#### 1. 백엔드 프록시 사용 (권장)
```javascript
// 프론트엔드에서 백엔드 API 호출
const fetchPopulationData = async () => {
  const response = await fetch('/api/seoul/population');
  return response.json();
};
```

#### 2. 개발 환경 프록시 설정
```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/seoul-api': {
        target: 'http://openapi.seoul.go.kr:8088',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/seoul-api/, '')
      }
    }
  }
}
```

## 📈 데이터 활용 패턴

### 1. 실시간 모니터링
```javascript
const RealTimeMonitor = () => {
  const [places, setPlaces] = useState([]);

  useEffect(() => {
    const updateData = async () => {
      const data = await fetchPopulationData();
      setPlaces(data.sort((a, b) => a.crowdLevel - b.crowdLevel));
    };

    updateData();
    const interval = setInterval(updateData, 5 * 60 * 1000); // 5분마다
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>조용한 곳 TOP 10</h2>
      {places.slice(0, 10).map(place => (
        <PlaceCard key={place.id} place={place} />
      ))}
    </div>
  );
};
```

### 2. 지도 연동
```javascript
const MapWithPopulation = () => {
  const { data } = useSeoulPopulationData();

  useEffect(() => {
    if (window.kakao && data.length > 0) {
      const map = new window.kakao.maps.Map(document.getElementById('map'), {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
        level: 8
      });

      data.forEach(place => {
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(place.latitude, place.longitude),
          map: map
        });

        const infoWindow = new window.kakao.maps.InfoWindow({
          content: `
            <div style="padding:5px;">
              <strong>${place.name}</strong><br/>
              인구: ${place.population}명<br/>
              혼잡도: ${['한적함', '보통', '혼잡'][place.crowdLevel]}
            </div>
          `
        });

        window.kakao.maps.event.addListener(marker, 'click', () => {
          infoWindow.open(map, marker);
        });
      });
    }
  }, [data]);

  return <div id="map" style={{ width: '100%', height: '400px' }}></div>;
};
```

## 🔄 데이터 캐싱 전략

### 1. 로컬 스토리지 캐싱
```javascript
const CachedSeoulAPI = {
  CACHE_KEY: 'seoul_population_data',
  CACHE_DURATION: 10 * 60 * 1000, // 10분

  async getData() {
    const cached = this.getCachedData();
    if (cached) return cached;

    const fresh = await this.fetchFreshData();
    this.setCachedData(fresh);
    return fresh;
  },

  getCachedData() {
    const item = localStorage.getItem(this.CACHE_KEY);
    if (!item) return null;

    const { data, timestamp } = JSON.parse(item);
    if (Date.now() - timestamp > this.CACHE_DURATION) {
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    }
    return data;
  },

  setCachedData(data) {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }
};
```

## 📊 에러 처리

### API 응답 코드
- `INFO-000`: 정상 처리
- `INFO-200`: 해당하는 데이터가 없음
- `ERROR-300`: 필수값 누락
- `ERROR-500`: 서버 오류
- `ERROR-600`: 데이터베이스 연결 실패

### 에러 처리 예시
```javascript
const handleAPIResponse = (response) => {
  const result = response.SPOP_LOCAL_RESD_DONG?.RESULT;
  
  switch (result?.CODE) {
    case 'INFO-000':
      return response.SPOP_LOCAL_RESD_DONG.row;
    case 'INFO-200':
      console.warn('데이터 없음');
      return [];
    case 'ERROR-300':
      throw new Error('필수 파라미터 누락');
    case 'ERROR-500':
      throw new Error('서버 오류');
    default:
      throw new Error(`알 수 없는 오류: ${result?.CODE}`);
  }
};
```

## 🎯 최적화 팁

### 1. 배치 처리
```javascript
// 여러 API를 동시에 호출
const fetchAllData = async () => {
  const [population, subway, bus] = await Promise.all([
    fetchPopulationData(),
    fetchSubwayData(),
    fetchBusData()
  ]);
  
  return { population, subway, bus };
};
```

### 2. 데이터 압축
```javascript
// 필요한 필드만 추출
const optimizeData = (rawData) => {
  return rawData.map(item => ({
    id: item.AREA_CD,
    name: item.AREA_NM,
    pop: parseInt(item.LIVE_PPLTN_STTS),
    lat: parseFloat(item.Y_COORD),
    lng: parseFloat(item.X_COORD)
  }));
};
```

## 🔗 유용한 링크

- **서울 열린데이터광장**: https://data.seoul.go.kr
- **API 문서**: https://data.seoul.go.kr/dataList/OA-15245/A/1/datasetView.do
- **카카오 지도 API**: https://apis.map.kakao.com
- **샘플 코드**: https://github.com/seoul-data/examples

## 💡 실제 사용 예시

현재 쉿플레이스 프로젝트에서는 다음과 같이 활용하고 있습니다:

```javascript
// 현재 구현된 API 엔드포인트
GET https://48hywqoyra.execute-api.us-east-1.amazonaws.com/dev/population

// 응답 예시
[
  {
    "id": "seoul_real_1",
    "name": "종로구 청운효자동",
    "lat": 37.5834,
    "lng": 126.9658,
    "population": 1234,
    "noiseLevel": 0,
    "crowdLevel": 0,
    "dataSource": "서울 열린데이터광장"
  }
]
```

이 가이드를 참고하여 서울시 실시간 데이터를 효과적으로 활용하세요!
