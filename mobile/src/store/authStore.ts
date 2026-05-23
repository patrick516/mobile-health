import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  name: string;
  email: string;
  gender?: string;
  age?: number;
  photoUrl?: string;
  isPremium?: boolean;
  verified?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  hydrate: () => Promise<void>;
}

let _token: string | null = null;

export const getAuthToken = () => _token;

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  hydrated: false,

  setAuth: async (token, user) => {
    _token = token;
    await AsyncStorage.setItem("auth_token", token);
    await AsyncStorage.setItem("auth_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: async () => {
    _token = null;
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("auth_user");
    set({ token: null, user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const userStr = await AsyncStorage.getItem("auth_user");
      if (token && userStr) {
        _token = token;
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
      }
    } catch {
      // ignore
    } finally {
      set({ hydrated: true });
    }
  },
}));
