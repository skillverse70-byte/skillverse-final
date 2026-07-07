import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  mapReadyStateToConnectionState,
  useRealtimeChannel,
} from "@/lib/realtime/socket-client";
import { getStoredAccessToken } from "@/services/auth/backend-auth-client";
import {
  fetchNotifications,
  fetchNotificationSummary,
  normalizeNotification,
} from "@/services/notifications/notifications.service";
import { useAppShellStore } from "@/stores/app-shell-store";

export function useNotificationBootstrap() {
  const { isAuthenticated, user } = useAuth();
  const accessToken = getStoredAccessToken();
  const setNotifications = useAppShellStore((state) => state.setNotifications);
  const setUnreadNotificationCount = useAppShellStore(
    (state) => state.setUnreadNotificationCount,
  );
  const prependNotification = useAppShellStore((state) => state.prependNotification);
  const setNotificationConnectionState = useAppShellStore(
    (state) => state.setNotificationConnectionState,
  );
  const resetAppShellState = useAppShellStore((state) => state.resetAppShellState);
  const { lastJsonMessage, readyState } = useRealtimeChannel(
    "notifications",
    accessToken ? { token: accessToken } : {},
    {},
    Boolean(isAuthenticated && user?.id && accessToken),
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      resetAppShellState();
      return undefined;
    }

    let active = true;

    const loadNotifications = async () => {
      try {
        const [notifications, summary] = await Promise.all([
          fetchNotifications(),
          fetchNotificationSummary(),
        ]);

        if (!active) {
          return;
        }

        setNotifications(notifications);
        setUnreadNotificationCount(summary.unreadCount);
      } catch {
        if (active) {
          setNotifications([]);
          setUnreadNotificationCount(0);
        }
      }
    };

    loadNotifications();

    return () => {
      active = false;
    };
  }, [
    isAuthenticated,
    resetAppShellState,
    setNotifications,
    setUnreadNotificationCount,
    user?.id,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotificationConnectionState("idle");
      return;
    }

    setNotificationConnectionState(mapReadyStateToConnectionState(readyState));
  }, [isAuthenticated, readyState, setNotificationConnectionState, user?.id]);

  useEffect(() => {
    if (!lastJsonMessage) {
      return;
    }

    if (lastJsonMessage.type === "connection.ready") {
      setUnreadNotificationCount(lastJsonMessage.summary?.unread_count || 0);
      return;
    }

    if (lastJsonMessage.type === "notification.created" && lastJsonMessage.notification) {
      prependNotification(normalizeNotification(lastJsonMessage.notification));
      setUnreadNotificationCount(lastJsonMessage.summary?.unread_count || 0);
      return;
    }

    if (lastJsonMessage.type === "notifications.unread.updated") {
      setUnreadNotificationCount(lastJsonMessage.summary?.unread_count || 0);
    }
  }, [
    lastJsonMessage,
    prependNotification,
    setUnreadNotificationCount,
  ]);
}

