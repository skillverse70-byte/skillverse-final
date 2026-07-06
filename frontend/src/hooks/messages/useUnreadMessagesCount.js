import { useEffect } from "react";
import { fetchConversations } from "@/services/messages/messages.service";
import { useRealtimePath } from "@/lib/realtime/socket-client";
import { getStoredAccessToken } from "@/services/auth/backend-auth-client";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useAuth } from "@/contexts/AuthContext";
import { roles } from "@/lib/domain-enums";

export function useUnreadMessagesCount() {
  const { isAuthenticated, user, actorRole } = useAuth();
  const setUnreadNotificationCount = useAppShellStore(
    (state) => state.setUnreadNotificationCount,
  );
  const isRegularUser = actorRole === roles.regularUser;
  const accessToken = getStoredAccessToken();
  const { lastJsonMessage } = useRealtimePath(
    "/ws/messages/inbox/",
    accessToken ? { token: accessToken } : {},
    {},
    Boolean(isRegularUser && isAuthenticated && user?.id && accessToken),
  );

  useEffect(() => {
    if (!isRegularUser || !isAuthenticated || !user?.id) {
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
  }, [actorRole, isAuthenticated, isRegularUser, setUnreadNotificationCount, user?.id]);

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
