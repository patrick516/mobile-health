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
    // 1. Handle Token Expiration / Unauthorized
    if (err.response?.status === 401 || err.response?.status === 403) {
      console.warn("[API] Session expired or unauthorized. Logging out.");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");

      // Only redirect if not already on the login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // 2. Handle Network Errors (Backend is down or wrong URL)
    if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
      console.error(
        "[API] Network error. Is the backend running and is VITE_API_URL correct?",
      );
      // We don't redirect here, but we log it so you can debug
    }

    return Promise.reject(err);
  },
);

export default api;
