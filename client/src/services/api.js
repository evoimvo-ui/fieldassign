import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Dodaj JWT token na svaki request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fo_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — redirect na login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fo_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const changePassword = (currentPassword, newPassword) => {
  return api.post('/auth/change-password', { currentPassword, newPassword });
};

export default api;
