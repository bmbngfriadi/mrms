import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/meeting-room')) {
    return '/meeting-room/api';
  }
  return '/mrms/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mrms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mrms_token');
      localStorage.removeItem('mrms_user');
      // If unauthorized and not already on login page, redirect
      if (!window.location.pathname.includes('/login')) {
        const basePrefix = window.location.pathname.startsWith('/meeting-room') ? '/meeting-room' : '/mrms';
        window.location.href = `${basePrefix}/login`;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

