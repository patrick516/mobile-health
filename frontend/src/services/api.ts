import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // ONLY log out if it's a 401 (Token expired or missing)
    // Do NOT log out on 403 (Forbidden) - that just means wrong role for a specific page.
    if (err.response?.status === 401) {
      console.warn("[API] Session expired. Logging out.");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  },
);

export default api;
