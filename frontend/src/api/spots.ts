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
    try {
      const response = await spotsClient.post(`/spots/${spotId}/like`, {});
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      return {
        success: true,
        message: 'Success',
        likes: data.likes || data.like_count || 0,
        dislikes: data.dislikes || data.dislike_count || 0
      };
    } catch (error) {
      console.error('Like API Error:', error);
      return {
        success: false,
        message: 'Failed',
        likes: 0,
        dislikes: 0
      };
    }
  },

  async dislikeSpot(spotId: string): Promise<ReactionResponse> {
    try {
      const response = await spotsClient.post(`/spots/${spotId}/dislike`, {});
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      return {
        success: true,
        message: 'Success',
        likes: data.likes || data.like_count || 0,
        dislikes: data.dislikes || data.dislike_count || 0
      };
    } catch (error) {
      console.error('Dislike API Error:', error);
      return {
        success: false,
        message: 'Failed',
        likes: 0,
        dislikes: 0
      };
    }
  },

  async deleteSpot(spotId: string): Promise<{ success: boolean; message: string }> {
    try {
      await spotsClient.delete(`/spots/${spotId}`);
      return {
        success: true,
        message: '장소가 삭제되었습니다.'
      };
    } catch (error) {
      console.error('Delete Spot API Error:', error);
      return {
        success: false,
        message: '장소 삭제에 실패했습니다.'
      };
    }
  }
};
