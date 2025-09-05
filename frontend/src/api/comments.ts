import { spotsClient } from './config';
import { Comment, CreateCommentRequest, GetCommentsRequest } from './models';

export const commentsApi = {
  async getComments(params: GetCommentsRequest): Promise<Comment[]> {
    try {
      const { spot_id, limit = 5 } = params;
      const response = await spotsClient.get(`/spots/${spot_id}/comments`, { 
        params: { limit }
      });
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      
      // 다양한 응답 구조 처리
      if (Array.isArray(data)) {
        return data;
      }
      if (data.comments && Array.isArray(data.comments)) {
        return data.comments;
      }
      if (data.body) {
        const bodyData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        return bodyData.comments || bodyData || [];
      }
      
      return [];
    } catch (error) {
      console.error('Get Comments API Error:', error);
      return [];
    }
  },

  async createComment(request: CreateCommentRequest): Promise<Comment> {
    try {
      const { spot_id, content, user_id, nickname } = request;
      const response = await spotsClient.post(`/spots/${spot_id}/comments`, {
        content,
        user_id: user_id || 'anonymous',
        nickname: nickname || '익명'
      });
      
      const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      
      // 다양한 응답 구조 처리
      if (data.comment) {
        return data.comment;
      }
      if (data.body) {
        const bodyData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        return bodyData.comment || bodyData;
      }
      
      // 기본 댓글 객체 반환
      return {
        id: Date.now().toString(),
        spot_id,
        content,
        nickname: nickname || '익명',
        user_id: user_id || 'anonymous',
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Create Comment API Error:', error);
      throw error;
    }
  }
};
