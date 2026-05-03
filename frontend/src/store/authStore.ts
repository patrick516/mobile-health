// src/store/authStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/apiClient";

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post<{ token: string; admin: Admin }>(
            "/admin/auth/login",
            { email, password },
          );

          // Store token so apiClient getToken() reads it
          localStorage.setItem("anzathu_admin_token", res.token);

          set({
            token: res.token,
            admin: res.admin,
            isLoading: false,
            error: null,
          });
        } catch (err: any) {
          set({
            error: err.message || "Invalid credentials",
            isLoading: false,
          });
        }
      },

      logout: () => {
        localStorage.removeItem("anzathu_admin_token");
        set({ token: null, admin: null, error: null });
      },
    }),
    {
      name: "anzathu-admin-auth",
      partialize: (state) => ({ token: state.token, admin: state.admin }),
    },
  ),
);
