// 실제 DynamoDB ImageMetadata 테이블 구조에 맞는 모델
export interface ImageMetadata {
  imageId: string;
  filename: string;
  size: number;
  s3Key: string;
  uploadTime: string;
  spot_id?: string;
}

// 이미지 업로드 요청 (Lambda ImageUploadFunction 함수용)
export interface UploadImageRequest {
  file: File;
  spot_id?: string;
}

// 이미지 업로드 응답 (ImageUploadFunction Lambda 응답)
export interface UploadImageResponse {
  success: boolean;
  imageId: string;
  s3Key: string;
  uploadTime: string;
  viewUrl: string;
}
