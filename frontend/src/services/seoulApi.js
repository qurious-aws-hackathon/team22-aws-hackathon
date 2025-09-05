// 서울 실시간 데이터 API 연동
const SEOUL_API_BASE = 'http://openapi.seoul.go.kr:8088';
const API_KEY = 'sample'; // 실제 키로 교체 필요

// CORS 문제로 인해 프록시 서버 또는 백엔드를 통해 호출해야 함
export const fetchSeoulPopulationData = async () => {
  try {
    // 실제 환경에서는 백엔드 API를 통해 호출
    const response = await fetch('/api/seoul/population');
    return await response.json();
  } catch (error) {
    console.error('서울 인구 데이터 가져오기 실패:', error);
    return generateMockSeoulData();
  }
};

// 실제 서울 데이터 기반 목업 생성 (강남구 상세 분석 포함)
const generateMockSeoulData = () => {
  const seoulAreas = [
    // 강남구 상세 지역
    { name: "강남구 역삼동", lat: 37.5009, lng: 127.0364, basePopulation: 8500, type: "business" },
    { name: "강남구 논현동", lat: 37.5048, lng: 127.0280, basePopulation: 4200, type: "residential" },
    { name: "강남구 압구정동", lat: 37.5274, lng: 127.0280, basePopulation: 3800, type: "shopping" },
    { name: "강남구 청담동", lat: 37.5197, lng: 127.0474, basePopulation: 2900, type: "luxury" },
    { name: "강남구 삼성동", lat: 37.5090, lng: 127.0634, basePopulation: 6700, type: "business" },
    { name: "강남구 대치동", lat: 37.4951, lng: 127.0619, basePopulation: 5100, type: "education" },
    
    // 기타 주요 지역
    { name: "종로구 인사동", lat: 37.5714, lng: 126.9858, basePopulation: 3200, type: "cultural" },
    { name: "마포구 홍대", lat: 37.5563, lng: 126.9236, basePopulation: 12000, type: "entertainment" },
    { name: "용산구 이태원", lat: 37.5347, lng: 126.9947, basePopulation: 4500, type: "international" },
    { name: "성동구 성수동", lat: 37.5446, lng: 127.0569, basePopulation: 2800, type: "trendy" },
    { name: "서초구 서초동", lat: 37.4837, lng: 127.0324, basePopulation: 7200, type: "business" },
    { name: "중구 명동", lat: 37.5636, lng: 126.9834, basePopulation: 9800, type: "shopping" },
    { name: "영등포구 여의도", lat: 37.5219, lng: 126.9245, basePopulation: 6200, type: "finance" }
  ];

  return seoulAreas.map((area, index) => {
    // 시간대별 인구 변동 시뮬레이션
    const hour = new Date().getHours();
    let populationMultiplier = 1;
    
    // 지역 타입별 시간대 패턴
    if (hour >= 9 && hour <= 18) {
      if (area.type === 'business' || area.type === 'finance') {
        populationMultiplier = 1.8;
      } else if (area.type === 'education') {
        populationMultiplier = 2.2;
      } else if (area.type === 'shopping') {
        populationMultiplier = 1.4;
      } else {
        populationMultiplier = 1.1;
      }
    } else if (hour >= 19 && hour <= 23) {
      if (area.type === 'entertainment') {
        populationMultiplier = 2.5;
      } else if (area.type === 'shopping' || area.type === 'cultural') {
        populationMultiplier = 1.6;
      } else if (area.type === 'residential') {
        populationMultiplier = 1.8;
      } else {
        populationMultiplier = 0.7;
      }
    } else {
      populationMultiplier = area.type === 'residential' ? 1.2 : 0.3;
    }

    const currentPopulation = Math.floor(area.basePopulation * populationMultiplier * (0.8 + Math.random() * 0.4));
    
    return {
      id: `seoul_${index + 1}`,
      name: area.name,
      lat: area.lat,
      lng: area.lng,
      population: currentPopulation,
      noiseLevel: calculateNoiseLevel(currentPopulation, area.name, area.type),
      crowdLevel: calculateCrowdLevel(currentPopulation, area.type),
      category: getAreaDescription(area.type),
      type: area.type,
      lastUpdated: new Date().toISOString(),
      walkingRecommendation: getWalkingRecommendation(area.type, currentPopulation)
    };
  });
};

const calculateCrowdLevel = (population, areaType) => {
  let threshold1 = 3000;
  let threshold2 = 8000;
  
  // 지역 타입별 임계값 조정
  if (areaType === 'residential' || areaType === 'luxury') {
    threshold1 = 2000;
    threshold2 = 5000;
  } else if (areaType === 'entertainment' || areaType === 'shopping') {
    threshold1 = 5000;
    threshold2 = 12000;
  }
  
  if (population < threshold1) return 0; // 낮음
  if (population < threshold2) return 1; // 보통
  return 2; // 높음
};

const calculateNoiseLevel = (population, areaName, areaType) => {
  let baseNoise = 0;
  
  // 지역 특성 반영
  if (areaType === 'entertainment' || areaType === 'shopping') {
    baseNoise = 1;
  } else if (areaType === 'business' || areaType === 'finance') {
    baseNoise = 1;
  } else if (areaType === 'residential' || areaType === 'luxury') {
    baseNoise = 0;
  }
  
  // 인구 밀도 반영
  if (population > 8000) baseNoise += 1;
  if (population > 15000) baseNoise += 1;
  
  return Math.min(baseNoise, 2);
};

const getAreaDescription = (type) => {
  const descriptions = {
    business: "비즈니스 지구",
    residential: "주거 지역",
    shopping: "쇼핑 지역",
    luxury: "고급 주거지",
    education: "교육 지구",
    cultural: "문화 지역",
    entertainment: "유흥 지역",
    international: "국제 지역",
    trendy: "트렌디 지역",
    finance: "금융 지구"
  };
  return descriptions[type] || "일반 지역";
};

const getWalkingRecommendation = (type, population) => {
  if (population < 3000) {
    if (type === 'residential' || type === 'luxury') {
      return "조용한 주택가 산책로 추천";
    } else if (type === 'cultural') {
      return "한적한 문화 탐방 코스";
    }
    return "여유로운 산책하기 좋음";
  } else if (population < 8000) {
    return "적당한 활기의 거리 산책";
  } else {
    return "사람 많은 번화가";
  }
};
