// 모델 export
export * from './models';

// API 클라이언트 export
export * from './config';
export * from './population';
export * from './spots';
export * from './comments';
export * from './images';
export * from './chatbot';
export * from './auth';

// 통합 API 객체
import { populationApi } from './population';
import { spotsApi } from './spots';
import { commentsApi } from './comments';
import { imagesApi } from './images';
import { chatbotApi } from './chatbot';
import { authApi } from './auth';

export const api = {
  population: populationApi,
  spots: spotsApi,
  comments: commentsApi,
  images: imagesApi,
  chatbot: chatbotApi,
  auth: authApi
};
