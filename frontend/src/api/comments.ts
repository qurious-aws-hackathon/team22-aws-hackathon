import { spotsClient } from './config';
import { Comment, CreateCommentRequest, GetCommentsRequest } from './models';

export const commentsApi = {
  async getComments(params: GetCommentsRequest): Promise<Comment[]> {
    const { spot_id, ...queryParams } = params;
    const response = await spotsClient.get(`/spots/${spot_id}/comments`, { 
      params: queryParams 
    });
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data.comments || data;
  },

  async createComment(request: CreateCommentRequest): Promise<Comment> {
    const { spot_id, content, user_id, nickname } = request;
    const response = await spotsClient.post(`/spots/${spot_id}/comments`, {
      content,
      user_id,
      nickname
    });
    const responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return responseData.comment || responseData;
  }
};
