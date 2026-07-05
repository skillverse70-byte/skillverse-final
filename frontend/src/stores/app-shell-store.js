import { create } from "zustand";

export const useAppShellStore = create((set) => ({
  unreadNotificationCount: 0,
  activeConversationId: null,
  activeSessionDraft: null,
  liveConnectionState: "idle",
  globalFilters: {
    field: null,
    skill: null,
    organizationType: null,
  },
  setUnreadNotificationCount: (count) =>
    set({ unreadNotificationCount: Math.max(0, Number(count) || 0) }),
  setActiveConversationId: (conversationId) =>
    set({ activeConversationId: conversationId }),
  setActiveSessionDraft: (draft) => set({ activeSessionDraft: draft }),
  setLiveConnectionState: (state) => set({ liveConnectionState: state }),
  setGlobalFilters: (filters) =>
    set((current) => ({
      globalFilters: {
        ...current.globalFilters,
        ...filters,
      },
    })),
  resetAppShellState: () =>
    set({
      unreadNotificationCount: 0,
      activeConversationId: null,
      activeSessionDraft: null,
      liveConnectionState: "idle",
      globalFilters: {
        field: null,
        skill: null,
        organizationType: null,
      },
    }),
}));
