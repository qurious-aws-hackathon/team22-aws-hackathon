// 실제 DynamoDB PlacesCurrent 테이블 구조에 맞는 모델
export interface PlacePopulation {
  place_id: string;
  current: string; // "latest" 값
  geohash: string;
  lastUpdated: string;
  name: string;
  lat: number;
  lng: number;
  population: number;                 // 지역의 유동인구수
  crowdLevel: number;                 // 혼잡도 레벨
  noiseLevel: number;                 // 소음 레벨
  walkingRecommendation?: string;     
  dataSource?: string;
  category?: string;
  type?: string;
  areaCode?: string;
  updateTime?: string;
  ttl?: number;
}

// 인구밀도 조회 요청 (Lambda populationAPI 함수용)
export interface GetPopulationRequest {
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
}
