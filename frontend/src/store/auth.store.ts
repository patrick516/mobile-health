import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAdmin: () => boolean;
  isNurse: () => boolean;
  isDHO: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(user));
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        set({ user: null, token: null });
      },
      isAdmin: () => get().user?.role === "ADMIN",
      isNurse: () => get().user?.role === "NURSE",
      isDHO: () => get().user?.role === "DISTRICT_OFFICER",
    }),
    { name: "auth-store" },
  ),
);
