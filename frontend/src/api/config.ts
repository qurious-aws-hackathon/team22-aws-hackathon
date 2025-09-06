import axios from 'axios';

const API_BASE_URLS = {
  population: 'https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod',
  spots: 'https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod',
  images: 'https://7smx6otaai.execute-api.us-east-1.amazonaws.com/prod',
  chat: 'https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod'
};

// Axios 인스턴스 생성
export const populationClient = axios.create({
  baseURL: API_BASE_URLS.population,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export const spotsClient = axios.create({
  baseURL: API_BASE_URLS.spots,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export const imagesClient = axios.create({
  baseURL: API_BASE_URLS.images,
  timeout: 30000,
  headers: {
    'Accept': 'application/json'
  }
});

export const chatClient = axios.create({
  baseURL: API_BASE_URLS.chat,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// 공통 에러 핸들링 및 로깅
[populationClient, spotsClient, imagesClient, chatClient].forEach(client => {
  // 요청 인터셉터
  client.interceptors.request.use(
    config => {
      return config;
    },
    error => {
      console.error('Request Error:', error);
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터
  client.interceptors.response.use(
    response => {
      return response;
    },
    error => {
      console.error('API Error Details:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return Promise.reject(error);
    }
  );
});
