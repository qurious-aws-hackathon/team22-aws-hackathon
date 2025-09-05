import { populationClient } from './config';
import { PlacePopulation, RealtimePopulationResponse, GetPopulationRequest } from './models';

export const populationApi = {
  async getPopulation(params?: GetPopulationRequest): Promise<PlacePopulation[]> {
    const response = await populationClient.get('/population', { params });
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data.places || data;
  },

  async getRealtimePopulation(params?: GetPopulationRequest): Promise<PlacePopulation[]> {
    const response = await populationClient.get('/realtime-population', { params });
    const data: RealtimePopulationResponse = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    
    // 서울시 실시간 도시데이터 형태를 기존 형태로 변환
    return data.data?.map(item => ({
      place_id: item.area_code,
      current: 'latest',
      geohash: `${item.lat}_${item.lng}`,
      lastUpdated: item.update_time,
      name: item.area_name,
      lat: item.lat,
      lng: item.lng,
      population: Math.floor((item.population_min + item.population_max) / 2),
      congestLevel: item.congest_level,
      noiseLevel: this.estimateNoiseLevel(item.congest_level, item.population_min, item.population_max),
      walkingRecommendation: item.congest_message,
      dataSource: '서울시 실시간 도시데이터',
      category: item.category,
      type: 'realtime',
      areaCode: item.area_code,
      updateTime: item.update_time,
      populationMin: item.population_min,
      populationMax: item.population_max
    })) || [];
  },

  estimateNoiseLevel(congest_level: string, min_pop: number, max_pop: number): number {
    const avgPop = (min_pop + max_pop) / 2;
    const baseNoise = Math.min(70, 30 + (avgPop / 100));
    
    switch (congest_level) {
      case '여유': return Math.max(25, baseNoise - 15);
      case '보통': return baseNoise;
      case '붐빔': return Math.min(80, baseNoise + 10);
      case '매우붐빔': return Math.min(90, baseNoise + 20);
      default: return baseNoise;
    }
  }
};
