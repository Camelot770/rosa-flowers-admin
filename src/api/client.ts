import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://roza-cvetov-camelot770.msk1.amvera.tech';

const api = axios.create({
  baseURL: `${API_URL}/api/admin`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rosa_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On these routes a 401 means a wrong password, not an expired session
const PASSWORD_CHECK_URLS = ['/auth/login', '/auth/password'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !PASSWORD_CHECK_URLS.includes(error.config?.url)) {
      localStorage.removeItem('rosa_admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
