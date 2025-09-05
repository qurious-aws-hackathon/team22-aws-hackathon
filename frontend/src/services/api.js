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
    
    // 조용한 곳 우선 정렬 (혼잡도 + 소음도 낮은 순)
    return allPlaces.sort((a, b) => {
      const scoreA = a.crowdLevel * 0.6 + a.noiseLevel * 0.4;
      const scoreB = b.crowdLevel * 0.6 + b.noiseLevel * 0.4;
      return scoreA - scoreB;
    });
  } catch (error) {
    console.error('Failed to load places:', error);
    return mockPlaces;
  }
};

export const getLevelText = (level, type) => {
  const levels = ['낮음', '보통', '높음'];
  return levels[level] || '알 수 없음';
};

export const getLevelClass = (level, type) => {
  const classes = ['low', 'medium', 'high'];
  return `${type}-${classes[level]}`;
};
