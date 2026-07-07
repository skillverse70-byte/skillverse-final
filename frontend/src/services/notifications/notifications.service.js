import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

export function normalizeNotification(payload = {}) {
  return {
    id: payload.id,
    type: payload.type || "",
    title: payload.title || "Notification",
    message: payload.message || "",
    action_url: payload.action_url || "",
    metadata: payload.metadata || {},
    is_read: Boolean(payload.is_read),
    read_at: payload.read_at || null,
    emailed_at: payload.emailed_at || null,
    created_at: payload.created_at || null,
  };
}

export async function fetchNotifications() {
  const payload = await authenticatedApiRequest("/notifications/", { method: "GET" });
  return Array.isArray(payload) ? payload.map(normalizeNotification) : [];
}

export async function fetchNotificationSummary() {
  const payload = await authenticatedApiRequest("/notifications/summary/", {
    method: "GET",
  });
  return {
    unreadCount: Math.max(0, Number(payload?.unread_count) || 0),
  };
}

export async function markNotificationAsRead(notificationId) {
  const payload = await authenticatedApiRequest(`/notifications/${notificationId}/read/`, {
    method: "POST",
  });
  return normalizeNotification(payload);
}

export async function markAllNotificationsAsRead() {
  const payload = await authenticatedApiRequest("/notifications/read-all/", {
    method: "POST",
  });
  return {
    updatedCount: Math.max(0, Number(payload?.updated_count) || 0),
    unreadCount: Math.max(0, Number(payload?.unread_count) || 0),
  };
}

