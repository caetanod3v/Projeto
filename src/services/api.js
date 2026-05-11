import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://projeto-0loe.onrender.com",
});

export default api;