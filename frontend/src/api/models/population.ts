// 실시간 인구밀도 API 응답 모델
export interface RealtimePopulationData {
  area_code: string;
  timestamp: string;
  area_name: string;
  category: string;
  lat: number;
  lng: number;
  congest_level: string;
  congest_message: string;
  population_min: number;
  population_max: number;
  male_rate: number;
  female_rate: number;
  age_rates: {
    rate_0: number;
    rate_10: number;
    rate_20: number;
    rate_30: number;
    rate_40: number;
    rate_50: number;
    rate_60: number;
    rate_70: number;
  };
  resident_rate: number;
  non_resident_rate: number;
  update_time: string;
  forecast_data?: Array<{
    time: string;
    congest_level: string;
    population_min: number;
    population_max: number;
  }>;
}

export interface RealtimePopulationResponse {
  total_count: number;
  last_updated: string;
  filters_applied: {
    category: string | null;
    congest_level: string | null;
    include_forecast: boolean;
    limit: number | null;
  };
  data: RealtimePopulationData[];
}

// 기존 PlacePopulation 모델 (호환성 유지)
export interface PlacePopulation {
  place_id: string;
  current: string;
  geohash: string;
  lastUpdated: string;
  name: string;
  lat: number;
  lng: number;
  population: number;
  congestLevel: string;
  noiseLevel: number;
  walkingRecommendation?: string;
  dataSource?: string;
  category?: string;
  type?: string;
  areaCode?: string;
  updateTime?: string;
  ttl?: number;
  populationMin?: number;
  populationMax?: number;
}

export interface GetPopulationRequest {
  lat?: number;
  lng?: number;
  radius?: number;
  limit?: number;
}
