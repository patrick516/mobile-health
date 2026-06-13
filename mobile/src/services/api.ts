import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;

      console.log("[API] 401 Unauthorized - Redirecting to login");

      // Clear stored auth data
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("auth_user");

      // Use setTimeout to ensure navigation happens after current execution
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 100);

      // Reset redirecting flag after delay
      setTimeout(() => {
        isRedirecting = false;
      }, 2000);
    }
    return Promise.reject(error);
  },
);

export default api;
