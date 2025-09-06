const API_BASE_URL = 'https://9ml7fncvu6.execute-api.us-east-1.amazonaws.com/prod';

export interface ImageUploadResponse {
  imageUrl: string;
  key: string;
  bucket: string;
}

export const imageUploadApi = {
  async uploadImage(file: File): Promise<ImageUploadResponse> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          
          const response = await fetch(`${API_BASE_URL}/upload/image`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Data,
              fileName: file.name,
              contentType: file.type
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload image');
          }

          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }
};
