import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://projeto-0loe.onrender.com",
});

api.interceptors.request.use((config) => {
  if (config.url && !config.url.startsWith("/api") && !config.url.startsWith("http")) {
    config.url = `/api${config.url.startsWith("/") ? config.url : `/${config.url}`}`;
  }

  const token = localStorage.getItem("token");

  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;

    if (data && typeof data === "object") {
      if (data.message && (!data.error || data.error === true)) {
        data.error = data.message;
      }

      if (typeof data.error === "string" && !data.message) {
        data.message = data.error;
      }
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error, fallback = "Nao foi possivel concluir a acao.") => (
  error.response?.data?.message
  || error.response?.data?.error
  || error.message
  || fallback
);

export default api;
