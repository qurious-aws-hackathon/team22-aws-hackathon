// 정적 데이터로 변경하여 API 요청 빈도 줄이기
const staticPlaces = [
  {
    id: 1,
    name: "한강공원 여의도",
    lat: 37.5285,
    lng: 126.9342,
    noiseLevel: 0,
    crowdLevel: 1,
    category: "공원",
    population: 150,
    quietScore: 85
  },
  {
    id: 2,
    name: "국립중앙도서관",
    lat: 37.5056,
    lng: 127.0394,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "도서관",
    population: 80,
    quietScore: 95
  },
  {
    id: 3,
    name: "선유도공원",
    lat: 37.5434,
    lng: 126.8956,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "공원",
    population: 60,
    quietScore: 90
  },
  {
    id: 4,
    name: "강남역 일대",
    lat: 37.4979,
    lng: 127.0276,
    noiseLevel: 2,
    crowdLevel: 2,
    category: "상업지구",
    population: 2500,
    quietScore: 25
  },
  {
    id: 5,
    name: "올림픽공원",
    lat: 37.5219,
    lng: 127.1241,
    noiseLevel: 1,
    crowdLevel: 1,
    category: "공원",
    population: 200,
    quietScore: 75
  },
  {
    id: 6,
    name: "북촌한옥마을",
    lat: 37.5825,
    lng: 126.9833,
    noiseLevel: 1,
    crowdLevel: 2,
    category: "관광지",
    population: 800,
    quietScore: 45
  },
  {
    id: 7,
    name: "남산공원",
    lat: 37.5512,
    lng: 126.9882,
    noiseLevel: 1,
    crowdLevel: 1,
    category: "공원",
    population: 300,
    quietScore: 70
  },
  {
    id: 8,
    name: "청계천",
    lat: 37.5694,
    lng: 126.9784,
    noiseLevel: 1,
    crowdLevel: 2,
    category: "하천",
    population: 600,
    quietScore: 50
  },
  {
    id: 9,
    name: "서울숲",
    lat: 37.5443,
    lng: 127.0378,
    noiseLevel: 1,
    crowdLevel: 1,
    category: "공원",
    population: 180,
    quietScore: 75
  },
  {
    id: 10,
    name: "반포한강공원",
    lat: 37.5133,
    lng: 126.9956,
    noiseLevel: 0,
    crowdLevel: 1,
    category: "공원",
    population: 120,
    quietScore: 85
  },
  {
    id: 11,
    name: "서울대공원",
    lat: 37.4269,
    lng: 127.0180,
    noiseLevel: 0,
    crowdLevel: 1,
    category: "공원",
    population: 250,
    quietScore: 80
  },
  {
    id: 12,
    name: "월드컵공원",
    lat: 37.5681,
    lng: 126.8975,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "공원",
    population: 90,
    quietScore: 88
  },
  {
    id: 13,
    name: "보라매공원",
    lat: 37.4840,
    lng: 126.9239,
    noiseLevel: 1,
    crowdLevel: 1,
    category: "공원",
    population: 180,
    quietScore: 72
  },
  {
    id: 14,
    name: "용산공원",
    lat: 37.5305,
    lng: 126.9809,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "공원",
    population: 70,
    quietScore: 92
  },
  {
    id: 15,
    name: "서울시립도서관",
    lat: 37.5665,
    lng: 126.9780,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "도서관",
    population: 45,
    quietScore: 98
  },
  {
    id: 16,
    name: "국립현대미술관",
    lat: 37.5758,
    lng: 126.9769,
    noiseLevel: 0,
    crowdLevel: 1,
    category: "미술관",
    population: 120,
    quietScore: 85
  },
  {
    id: 17,
    name: "덕수궁",
    lat: 37.5658,
    lng: 126.9751,
    noiseLevel: 1,
    crowdLevel: 1,
    category: "궁궐",
    population: 200,
    quietScore: 68
  },
  {
    id: 18,
    name: "창덕궁",
    lat: 37.5794,
    lng: 126.9910,
    noiseLevel: 0,
    crowdLevel: 1,
    category: "궁궐",
    population: 150,
    quietScore: 78
  },
  {
    id: 19,
    name: "경복궁",
    lat: 37.5788,
    lng: 126.9770,
    noiseLevel: 1,
    crowdLevel: 2,
    category: "궁궐",
    population: 800,
    quietScore: 45
  },
  {
    id: 20,
    name: "이태원",
    lat: 37.5344,
    lng: 126.9944,
    noiseLevel: 2,
    crowdLevel: 2,
    category: "상업지구",
    population: 1800,
    quietScore: 30
  },
  {
    id: 21,
    name: "홍대입구",
    lat: 37.5563,
    lng: 126.9236,
    noiseLevel: 2,
    crowdLevel: 2,
    category: "상업지구",
    population: 2200,
    quietScore: 20
  },
  {
    id: 22,
    name: "명동",
    lat: 37.5636,
    lng: 126.9834,
    noiseLevel: 2,
    crowdLevel: 2,
    category: "상업지구",
    population: 3000,
    quietScore: 15
  },
  {
    id: 23,
    name: "동대문디자인플라자",
    lat: 37.5665,
    lng: 127.0092,
    noiseLevel: 1,
    crowdLevel: 2,
    category: "문화시설",
    population: 600,
    quietScore: 55
  },
  {
    id: 24,
    name: "잠실한강공원",
    lat: 37.5197,
    lng: 127.0857,
    noiseLevel: 0,
    crowdLevel: 1,
    category: "공원",
    population: 180,
    quietScore: 82
  },
  {
    id: 25,
    name: "뚝섬한강공원",
    lat: 37.5311,
    lng: 127.0661,
    noiseLevel: 0,
    crowdLevel: 1,
    category: "공원",
    population: 160,
    quietScore: 84
  },
  {
    id: 26,
    name: "양화한강공원",
    lat: 37.5365,
    lng: 126.9015,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "공원",
    population: 100,
    quietScore: 87
  },
  {
    id: 27,
    name: "망원한강공원",
    lat: 37.5556,
    lng: 126.8947,
    noiseLevel: 0,
    crowdLevel: 1,
    category: "공원",
    population: 140,
    quietScore: 83
  },
  {
    id: 28,
    name: "성동구립도서관",
    lat: 37.5635,
    lng: 127.0369,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "도서관",
    population: 35,
    quietScore: 96
  },
  {
    id: 29,
    name: "강서구립도서관",
    lat: 37.5509,
    lng: 126.8495,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "도서관",
    population: 40,
    quietScore: 94
  },
  {
    id: 30,
    name: "응봉산",
    lat: 37.5486,
    lng: 127.0186,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "산",
    population: 25,
    quietScore: 95
  }
];

// AWS Lambda API 엔드포인트
const LAMBDA_API_URL = 'https://48hywqoyra.execute-api.us-east-1.amazonaws.com/dev/population';

// AWS Lambda에서 실시간 데이터 가져오기
const fetchFromLambda = async (userLocation) => {
  try {
    const params = new URLSearchParams({
      lat: userLocation?.lat || 37.5665,
      lng: userLocation?.lng || 126.9780,
      radius: 10000, // 10km 반경
      limit: 30
    });
    
    const response = await fetch(`${LAMBDA_API_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Lambda API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Lambda 데이터 로드 성공:', data.length, '개 장소');
    
    // Lambda 데이터를 우리 형식으로 변환
    return data.map(item => ({
      id: item.id,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      noiseLevel: item.noiseLevel,
      crowdLevel: item.crowdLevel,
      category: item.category,
      population: item.population,
      quietScore: calculateQuietScore(item.noiseLevel, item.crowdLevel, item.population),
      lastUpdated: item.lastUpdated,
      dataSource: item.dataSource
    }));
    
  } catch (error) {
    console.log('Lambda API 연결 실패:', error);
    return [];
  }
};

// 조용함 지수 계산
const calculateQuietScore = (noiseLevel, crowdLevel, population) => {
  let score = 100;
  
  // 소음 레벨에 따른 감점
  score -= noiseLevel * 25;
  
  // 혼잡도에 따른 감점
  score -= crowdLevel * 20;
  
  // 인구수에 따른 추가 감점
  if (population > 10000) score -= 15;
  else if (population > 5000) score -= 10;
  else if (population > 2000) score -= 5;
  
  return Math.max(10, Math.min(100, score));
};

export const fetchPlaces = async (userLocation = null) => {
  try {
    // AWS Lambda에서 실시간 데이터 시도
    const lambdaData = await fetchFromLambda(userLocation);
    
    if (lambdaData.length > 0) {
      return lambdaData;
    }
  } catch (error) {
    console.log('Lambda API 오류:', error);
  }
  
  // Lambda 실패시 정적 데이터 사용
  console.log('정적 데이터 사용');
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(staticPlaces);
    }, 200);
  });
};

// 점수에 따른 텍스트 반환
export const getScoreText = (score) => {
  if (score >= 80) return '매우 조용함';
  if (score >= 60) return '조용함';
  if (score >= 40) return '보통';
  if (score >= 20) return '시끄러움';
  return '매우 시끄러움';
};

// 점수에 따른 색상 반환
export const getScoreColor = (score) => {
  if (score >= 80) return '#4CAF50'; // 진한 초록
  if (score >= 60) return '#87CEEB'; // 하늘색
  if (score >= 40) return '#90EE90'; // 연한 초록
  if (score >= 20) return '#FFA726'; // 주황
  return '#FF6B6B'; // 빨강
};

// 점수에 따른 이모지 반환
export const getScoreEmoji = (score) => {
  if (score >= 80) return '🤫';
  if (score >= 60) return '😌';
  if (score >= 40) return '😐';
  if (score >= 20) return '😵';
  return '🔊';
};

// 레벨에 따른 텍스트 반환
export const getLevelText = (level) => {
  if (level === 0) return '낮음';
  if (level === 1) return '보통';
  return '높음';
};

// 레벨에 따른 CSS 클래스 반환
export const getLevelClass = (level, type) => {
  const baseClass = type === 'noise' ? 'noise' : 'crowd';
  if (level === 0) return `${baseClass}-low`;
  if (level === 1) return `${baseClass}-medium`;
  return `${baseClass}-high`;
};
