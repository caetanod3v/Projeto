import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://projeto-0loe.onrender.com/api',
});

api.interceptors.request.use(config => {
  const userStr = localStorage.getItem('usuario_logado');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && user.role) {
        config.headers['x-user-role'] = user.role;
      }
    } catch (e) {}
  }
  return config;
});

export default api;
