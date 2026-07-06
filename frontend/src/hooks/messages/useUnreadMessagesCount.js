import { useEffect } from "react";
import { fetchConversations } from "@/services/messages/messages.service";
import { useRealtimePath } from "@/lib/realtime/socket-client";
import { getStoredAccessToken } from "@/services/auth/backend-auth-client";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadMessagesCount() {
  const { isAuthenticated, user } = useAuth();
  const setUnreadNotificationCount = useAppShellStore(
    (state) => state.setUnreadNotificationCount,
  );
  const accessToken = getStoredAccessToken();
  const { lastJsonMessage } = useRealtimePath(
    "/ws/messages/inbox/",
    accessToken ? { token: accessToken } : {},
    {},
    Boolean(isAuthenticated && user?.id && accessToken),
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUnreadNotificationCount(0);
      return undefined;
    }

    let active = true;

    const syncUnreadCount = async () => {
      try {
        const { conversations } = await fetchConversations();
        if (!active) {
          return;
        }

        setUnreadNotificationCount(
          conversations.reduce(
            (count, conversation) => count + (Number(conversation.unread_count) || 0),
            0,
          ),
        );
      } catch {
        if (active) {
          setUnreadNotificationCount(0);
        }
      }
    };

    syncUnreadCount();

    return () => {
      active = false;
    };
  }, [isAuthenticated, setUnreadNotificationCount, user?.id]);

  useEffect(() => {
    if (!lastJsonMessage) {
      return;
    }

    if (
      lastJsonMessage.type === "connection.ready" ||
      lastJsonMessage.type === "messages.unread.updated"
    ) {
      setUnreadNotificationCount(lastJsonMessage.summary?.total_unread_count || 0);
    }
  }, [lastJsonMessage, setUnreadNotificationCount]);
}
