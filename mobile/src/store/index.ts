import { create } from "zustand";

interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  zoneAllocations: Array<{ zone: { id: string; name: string; taId: string } }>;
  taAllocations: Array<{ ta: { id: string; name: string } }>;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;

  // Sync
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  setPendingCount: (count: number) => void;
  setIsSyncing: (val: boolean) => void;
  setLastSyncAt: (date: Date) => void;

  // Language
  language: "en" | "ny";
  toggleLanguage: () => void;

  // Selected context
  selectedHouseholdId: string | null;
  selectedMemberId: string | null;
  selectedVisitId: string | null;
  setSelectedHousehold: (id: string | null) => void;
  setSelectedMember: (id: string | null) => void;
  setSelectedVisit: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => set({ user, token }),
  clearAuth: () => set({ user: null, token: null }),

  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  setPendingCount: (count) => set({ pendingCount: count }),
  setIsSyncing: (val) => set({ isSyncing: val }),
  setLastSyncAt: (date) => set({ lastSyncAt: date }),

  language: "en",
  toggleLanguage: () =>
    set((s) => ({ language: s.language === "en" ? "ny" : "en" })),

  selectedHouseholdId: null,
  selectedMemberId: null,
  selectedVisitId: null,
  setSelectedHousehold: (id) => set({ selectedHouseholdId: id }),
  setSelectedMember: (id) => set({ selectedMemberId: id }),
  setSelectedVisit: (id) => set({ selectedVisitId: id }),
}));
