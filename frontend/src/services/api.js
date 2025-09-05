import { fetchSeoulPopulationData } from './seoulApi.js';

// Mock API for demo purposes
const mockPlaces = [
  {
    id: 1,
    name: "한강공원 여의도",
    lat: 37.5285,
    lng: 126.9342,
    noiseLevel: 0,
    crowdLevel: 1,
    category: "공원"
  },
  {
    id: 2,
    name: "국립중앙도서관",
    lat: 37.5056,
    lng: 127.0394,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "도서관"
  },
  {
    id: 3,
    name: "선유도공원",
    lat: 37.5434,
    lng: 126.8956,
    noiseLevel: 0,
    crowdLevel: 0,
    category: "공원"
  },
  {
    id: 4,
    name: "서울숲",
    lat: 37.5443,
    lng: 127.0378,
    noiseLevel: 1,
    crowdLevel: 1,
    category: "공원"
  }
];

export const fetchPlaces = async () => {
  try {
    // 서울 실시간 데이터 가져오기
    const seoulData = await fetchSeoulPopulationData();
    
    // 기존 목업 데이터와 합치기
    const allPlaces = [...mockPlaces, ...seoulData];
    
    // 조용함 점수 계산 및 정렬
    const placesWithScore = allPlaces.map(place => ({
      ...place,
      quietScore: calculateQuietScore(place)
    }));
    
    // 조용한 곳 우선 정렬 (점수 높은 순)
    return placesWithScore.sort((a, b) => b.quietScore - a.quietScore);
  } catch (error) {
    console.error('Failed to load places:', error);
    return mockPlaces.map(place => ({
      ...place,
      quietScore: calculateQuietScore(place)
    }));
  }
};

// 조용함 점수 계산 (0~100점)
export const calculateQuietScore = (place) => {
  // 혼잡도와 소음도를 역산하여 조용함 점수 계산
  const crowdScore = (2 - place.crowdLevel) * 50; // 0~100
  const noiseScore = (2 - place.noiseLevel) * 50; // 0~100
  
  // 가중평균: 혼잡도 60%, 소음도 40%
  const finalScore = Math.round(crowdScore * 0.6 + noiseScore * 0.4);
  
  return Math.max(0, Math.min(100, finalScore));
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

export const getLevelText = (level, type) => {
  const levels = ['낮음', '보통', '높음'];
  return levels[level] || '알 수 없음';
};

export const getLevelClass = (level, type) => {
  const classes = ['low', 'medium', 'high'];
  return `${type}-${classes[level]}`;
};
