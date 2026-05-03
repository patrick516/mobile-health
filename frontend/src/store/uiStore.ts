import { create } from "zustand";
import type { PageKey } from "../lib/constants";
import type { User } from "../types";

interface UIState {
  activePage: PageKey;
  setActivePage: (page: PageKey) => void;

  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // Modal control
  openModal: string | null;
  showModal: (name: string) => void;
  hideModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePage: "dashboard",
  setActivePage: (activePage) => set({ activePage }),

  selectedUser: null,
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  openModal: null,
  showModal: (name) => set({ openModal: name }),
  hideModal: () => set({ openModal: null }),
}));
