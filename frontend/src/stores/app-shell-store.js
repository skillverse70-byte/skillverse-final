import { create } from "zustand";

export const useAppShellStore = create((set) => ({
  unreadNotificationCount: 0,
  unreadMessageCount: 0,
  notifications: [],
  notificationsHydrated: false,
  notificationConnectionState: "idle",
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
  setUnreadMessageCount: (count) =>
    set({ unreadMessageCount: Math.max(0, Number(count) || 0) }),
  setNotifications: (notifications) =>
    set({
      notifications: Array.isArray(notifications) ? notifications : [],
      notificationsHydrated: true,
    }),
  prependNotification: (notification) =>
    set((current) => ({
      notifications: [
        notification,
        ...current.notifications.filter((item) => item.id !== notification.id),
      ],
      notificationsHydrated: true,
    })),
  markNotificationReadInStore: (notificationId) =>
    set((current) => ({
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
              read_at: notification.read_at || new Date().toISOString(),
            }
          : notification,
      ),
    })),
  markAllNotificationsReadInStore: () =>
    set((current) => ({
      notifications: current.notifications.map((notification) =>
        notification.is_read
          ? notification
          : {
              ...notification,
              is_read: true,
              read_at: notification.read_at || new Date().toISOString(),
            }
      ),
    })),
  setNotificationConnectionState: (state) =>
    set({ notificationConnectionState: state }),
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
      unreadMessageCount: 0,
      notifications: [],
      notificationsHydrated: false,
      notificationConnectionState: "idle",
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
