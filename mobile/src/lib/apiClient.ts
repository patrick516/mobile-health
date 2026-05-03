import axios from "axios";
import { getAuthToken } from "../store/authStore";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.112:5000/api";

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token to every request
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      error.response?.data?.message ??
      error.message ??
      "Something went wrong";
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
