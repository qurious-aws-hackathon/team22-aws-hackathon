import { populationClient } from './config';
import { PlacePopulation, RealtimePopulationData, RealtimePopulationResponse, GetPopulationRequest } from './models';

export const populationApi = {
  async getPopulation(params?: GetPopulationRequest): Promise<PlacePopulation[]> {
    const response = await populationClient.get('/population', { params });
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data.places || data;
  },

  async getRealtimePopulation(params?: GetPopulationRequest): Promise<RealtimePopulationData[]> {
    const response = await populationClient.get('/realtime-population', { params });
    const data: RealtimePopulationResponse = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    
    // 서울시 실시간 도시데이터 형태를 기존 형태로 변환
    return data.data;
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
