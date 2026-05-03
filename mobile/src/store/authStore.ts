import { create } from "zustand";

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
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  isAuthenticated: boolean;
}

let _token: string | null = null;

export const getAuthToken = () => _token;

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    _token = token;
    set({ token, user, isAuthenticated: true });
  },

  clearAuth: () => {
    _token = null;
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
