import { spotsClient } from './config';
import {
  Spot,
  CreateSpotRequest,
  UpdateSpotRequest,
  GetSpotsRequest,
  GetSpotDetailResponse
} from './models';

interface ReactionResponse {
  success: boolean;
  message: string;
  likes: number;
  dislikes: number;
  userReaction: 'like' | 'dislike' | null;
}

// 사용자 ID 생성 (로컬 스토리지에서 관리)
const getUserId = (): string => {
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('user_id', userId);
  }
  return userId;
};

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
      const response = await spotsClient.post(`/spots/${spotId}/like`, {}, {
        headers: {
          'x-user-id': getUserId()
        }
      });
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      return {
        success: true,
        message: 'Success',
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        userReaction: data.userReaction || null
      };
    } catch (error) {
      console.error('Like API Error:', error);
      return {
        success: false,
        message: 'Failed',
        likes: 0,
        dislikes: 0,
        userReaction: null
      };
    }
  },

  async dislikeSpot(spotId: string): Promise<ReactionResponse> {
    try {
      const response = await spotsClient.post(`/spots/${spotId}/dislike`, {}, {
        headers: {
          'x-user-id': getUserId()
        }
      });
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      return {
        success: true,
        message: 'Success',
        likes: data.likes || 0,
        dislikes: data.dislikes || 0,
        userReaction: data.userReaction || null
      };
    } catch (error) {
      console.error('Dislike API Error:', error);
      return {
        success: false,
        message: 'Failed',
        likes: 0,
        dislikes: 0,
        userReaction: null
      };
    }
  },

  async getReactionStatus(spotId: string): Promise<{ userReaction: 'like' | 'dislike' | null }> {
    try {
      const response = await spotsClient.get(`/spots/${spotId}/like-status`, {
        headers: {
          'x-user-id': getUserId()
        }
      });
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      return {
        userReaction: data.userReaction || null
      };
    } catch (error) {
      console.error('Get Reaction Status API Error:', error);
      return {
        userReaction: null
      };
    }
  },

  async deleteSpot(spotId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await spotsClient.delete(`/spots/${spotId}`, {
        headers: {
          'x-user-id': getUserId(),
          'Content-Type': 'application/json'
        }
      });
      
      // 응답 상태 확인
      if (response.status === 200 || response.status === 204) {
        return {
          success: true,
          message: '장소가 삭제되었습니다.'
        };
      } else {
        return {
          success: false,
          message: '장소 삭제에 실패했습니다.'
        };
      }
    } catch (error: any) {
      console.error('Delete Spot API Error:', error);
      
      // CORS 에러 또는 네트워크 에러 처리
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
        return {
          success: false,
          message: '네트워크 연결을 확인해주세요.'
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || '장소 삭제에 실패했습니다.'
      };
    }
  }
};
