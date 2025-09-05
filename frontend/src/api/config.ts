import axios from 'axios';

const API_BASE_URLS = {
  population: 'https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod',
  spots: 'https://xx42krmzqc.execute-api.us-east-1.amazonaws.com/prod',
  images: 'https://7smx6otaai.execute-api.us-east-1.amazonaws.com/prod'
};

// Axios 인스턴스 생성
export const populationClient = axios.create({
  baseURL: API_BASE_URLS.population,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const spotsClient = axios.create({
  baseURL: API_BASE_URLS.spots,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const imagesClient = axios.create({
  baseURL: API_BASE_URLS.images,
  timeout: 30000
});

// 공통 에러 핸들링
[populationClient, spotsClient, imagesClient].forEach(client => {
  client.interceptors.response.use(
    response => response,
    error => {
      console.error('API Error:', error.response?.data || error.message);
      return Promise.reject(error);
    }
  );
});
