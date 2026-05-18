import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://projeto-0loe.onrender.com",
});

api.interceptors.request.use((config) => {
  if (config.url && !config.url.startsWith("/api") && !config.url.startsWith("http")) {
    config.url = `/api${config.url.startsWith("/") ? config.url : `/${config.url}`}`;
  }

  const userStr = localStorage.getItem("usuario_logado");

  if (userStr) {
    try {
      const data = JSON.parse(userStr);
      if (data?.token) {
        config.headers["Authorization"] = `Bearer ${data.token}`;
      }
    } catch (e) { }
  }

  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem("usuario_logado");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;