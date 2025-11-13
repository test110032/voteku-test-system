import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Получить все результаты тестов
export const getAllResults = async () => {
  const response = await api.get('/results');
  return response.data;
};

// Получить детальную информацию о конкретном тесте
export const getResultDetail = async (sessionId) => {
  const response = await api.get(`/results/${sessionId}`);
  return response.data;
};

// Получить статистику
export const getStatistics = async () => {
  const response = await api.get('/statistics');
  return response.data;
};

export default api;
