import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notifications/notifications.service";
import { useAppShellStore } from "@/stores/app-shell-store";

export function useNotifications({ limit = null, filterTypes = null } = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const notifications = useAppShellStore((state) => state.notifications);
  const unreadNotificationCount = useAppShellStore(
    (state) => state.unreadNotificationCount,
  );
  const notificationsHydrated = useAppShellStore(
    (state) => state.notificationsHydrated,
  );
  const notificationConnectionState = useAppShellStore(
    (state) => state.notificationConnectionState,
  );
  const setUnreadNotificationCount = useAppShellStore(
    (state) => state.setUnreadNotificationCount,
  );
  const markNotificationReadInStore = useAppShellStore(
    (state) => state.markNotificationReadInStore,
  );
  const markAllNotificationsReadInStore = useAppShellStore(
    (state) => state.markAllNotificationsReadInStore,
  );
  const [busyNotificationId, setBusyNotificationId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const visibleNotifications = useMemo(() => {
    const filtered = Array.isArray(filterTypes) && filterTypes.length > 0
      ? notifications.filter((notification) => filterTypes.includes(notification.type))
      : notifications;
    return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  }, [filterTypes, limit, notifications]);

  const markNotificationRead = async (notification) => {
    if (!notification?.id || notification.is_read) {
      return notification;
    }

    setBusyNotificationId(notification.id);
    try {
      const updatedNotification = await markNotificationAsRead(notification.id);
      markNotificationReadInStore(notification.id);
      setUnreadNotificationCount(unreadNotificationCount - 1);
      return updatedNotification;
    } catch (error) {
      toast({
        title: "Unable to update notification",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setBusyNotificationId(null);
    }
  };

  const openNotification = async (notification, { close } = {}) => {
    if (!notification) {
      return;
    }

    if (!notification.is_read) {
      try {
        await markNotificationRead(notification);
      } catch {
        return;
      }
    }

    if (typeof close === "function") {
      close(false);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const markAllAsRead = async () => {
    if (unreadNotificationCount <= 0) {
      return;
    }

    setMarkingAll(true);
    try {
      const payload = await markAllNotificationsAsRead();
      markAllNotificationsReadInStore();
      setUnreadNotificationCount(payload.unreadCount);
    } catch (error) {
      toast({
        title: "Unable to update notifications",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setMarkingAll(false);
    }
  };

  return {
    notifications: visibleNotifications,
    unreadNotificationCount,
    notificationsHydrated,
    notificationConnectionState,
    busyNotificationId,
    markingAll,
    openNotification,
    markNotificationRead,
    markAllAsRead,
  };
}

