// Mock API for demo purposes
const mockPlaces = [
  {
    id: 1,
    name: "한강공원 여의도",
    lat: 37.5285,
    lng: 126.9342,
    noiseLevel: Math.floor(Math.random() * 3),
    crowdLevel: Math.floor(Math.random() * 3),
    category: "공원"
  },
  {
    id: 2,
    name: "국립중앙도서관",
    lat: 37.5056,
    lng: 127.0394,
    noiseLevel: Math.floor(Math.random() * 3),
    crowdLevel: Math.floor(Math.random() * 3),
    category: "도서관"
  },
  {
    id: 3,
    name: "북촌한옥마을",
    lat: 37.5834,
    lng: 126.9834,
    noiseLevel: Math.floor(Math.random() * 3),
    crowdLevel: Math.floor(Math.random() * 3),
    category: "관광지"
  },
  {
    id: 4,
    name: "선유도공원",
    lat: 37.5434,
    lng: 126.8956,
    noiseLevel: Math.floor(Math.random() * 3),
    crowdLevel: Math.floor(Math.random() * 3),
    category: "공원"
  },
  {
    id: 5,
    name: "서울숲",
    lat: 37.5443,
    lng: 127.0378,
    noiseLevel: Math.floor(Math.random() * 3),
    crowdLevel: Math.floor(Math.random() * 3),
    category: "공원"
  }
];

export const fetchPlaces = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Randomize noise and crowd levels for demo
      const updatedPlaces = mockPlaces.map(place => ({
        ...place,
        noiseLevel: Math.floor(Math.random() * 3),
        crowdLevel: Math.floor(Math.random() * 3)
      }));
      resolve(updatedPlaces);
    }, 500);
  });
};

export const getLevelText = (level, type) => {
  const levels = ['낮음', '보통', '높음'];
  return levels[level] || '알 수 없음';
};

export const getLevelClass = (level, type) => {
  const classes = ['low', 'medium', 'high'];
  return `${type}-${classes[level]}`;
};
