import { imagesClient } from './config';
import { ImageMetadata, UploadImageRequest, UploadImageResponse } from './models';

export const imagesApi = {
  async uploadImage(request: UploadImageRequest): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('image', request.file);
    
    if (request.spot_id) formData.append('spot_id', request.spot_id);

    const response = await imagesClient.post('/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data;
  },

  async getImage(imageId: string): Promise<ImageMetadata> {
    const response = await imagesClient.get(`/images/${imageId}`);
    const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    return data.image || data;
  },

  getImageViewUrl(imageId: string): string {
    return `${imagesClient.defaults.baseURL}/images/${imageId}/view`;
  }
};
