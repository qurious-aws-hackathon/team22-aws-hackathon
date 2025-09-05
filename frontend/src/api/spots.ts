import { spotsClient } from './config';
import { 
  Spot, 
  CreateSpotRequest, 
  UpdateSpotRequest, 
  GetSpotsRequest, 
  GetSpotDetailResponse,
  ReactionResponse 
} from './models';

export const spotsApi = {
  async getSpots(params?: GetSpotsRequest): Promise<Spot[]> {
    const response = await spotsClient.get('/spots', { params });
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data.spots || data;
  },

  async createSpot(spot: CreateSpotRequest): Promise<Spot> {
    const response = await spotsClient.post('/spots', spot);
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data.spot || data;
  },

  async getSpot(spotId: string): Promise<GetSpotDetailResponse> {
    const response = await spotsClient.get(`/spots/${spotId}`);
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data.spot || data;
  },

  async updateSpot(spotId: string, updates: UpdateSpotRequest): Promise<Spot> {
    const response = await spotsClient.put(`/spots/${spotId}`, updates);
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data.spot || data;
  },

  async likeSpot(spotId: string): Promise<ReactionResponse> {
    const response = await spotsClient.post(`/spots/${spotId}/like`);
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data;
  },

  async dislikeSpot(spotId: string): Promise<ReactionResponse> {
    const response = await spotsClient.post(`/spots/${spotId}/dislike`);
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data;
  }
};
