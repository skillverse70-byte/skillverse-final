import { useEffect, useState } from "react";
import {
  mapReadyStateToConnectionState,
  useRealtimePath,
} from "@/lib/realtime/socket-client";
import { useAppShellStore } from "@/stores/app-shell-store";
import { getStoredAccessToken } from "@/services/auth/backend-auth-client";
import {
  fetchConversation,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendConversationMessage,
} from "@/services/messages/messages.service";

function appendUniqueMessage(currentMessages, incomingMessage) {
  if (!incomingMessage?.id) {
    return currentMessages;
  }

  const existingIndex = currentMessages.findIndex(
    (message) => message.id === incomingMessage.id,
  );

  if (existingIndex === -1) {
    return [...currentMessages, incomingMessage].sort(
      (left, right) =>
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
    );
  }

  return currentMessages.map((message) =>
    message.id === incomingMessage.id ? incomingMessage : message,
  );
}

function updateConversationSummary(conversations, threadId, message) {
  return conversations
    .map((conversation) =>
      conversation.id === threadId
        ? {
            ...conversation,
            latest_message: message,
            updated_at: message.created_at,
          }
        : conversation,
    )
    .sort(
      (left, right) =>
        new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
    );
}

function sumUnreadCounts(conversations) {
  return conversations.reduce(
    (count, conversation) => count + (Number(conversation.unread_count) || 0),
    0,
  );
}

export function useMessages(initialConversationId = "") {
  const [me, setMe] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceLabel, setResourceLabel] = useState("");
  const [showResourceFields, setShowResourceFields] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const setActiveConversationId = useAppShellStore(
    (state) => state.setActiveConversationId,
  );
  const setLiveConnectionState = useAppShellStore(
    (state) => state.setLiveConnectionState,
  );
  const setUnreadNotificationCount = useAppShellStore(
    (state) => state.setUnreadNotificationCount,
  );
  const selectedConversationId = selected?.id ?? null;
  const accessToken = getStoredAccessToken();
  const { lastJsonMessage, readyState } = useRealtimePath(
    selectedConversationId
      ? `/ws/messages/threads/${selectedConversationId}/`
      : null,
    accessToken ? { token: accessToken } : {},
    {},
    Boolean(selectedConversationId && accessToken),
  );
  const connectionState = selectedConversationId
    ? mapReadyStateToConnectionState(readyState)
    : "idle";

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setError("");
        const data = await fetchConversations();
        if (!active) {
          return;
        }
        setMe(data.user);
        setConversations(data.conversations);
        setUnreadNotificationCount(sumUnreadCounts(data.conversations));

        if (initialConversationId) {
          const preferredConversation = data.conversations.find(
            (conversation) => String(conversation.id) === String(initialConversationId),
          );
          if (preferredConversation) {
            setSelected(preferredConversation);
            const nextMessages = await fetchMessages(preferredConversation.id);
            if (!active) {
              return;
            }
            setMessages(nextMessages);
            const readReceipt = await markConversationRead(preferredConversation.id);
            if (!active) {
              return;
            }
            setSelected((current) =>
              current && current.id === preferredConversation.id
                ? {
                    ...current,
                    unread_count: readReceipt.unread_count,
                    has_unread: readReceipt.has_unread,
                    last_read_message_id: readReceipt.last_read_message_id,
                    last_read_at: readReceipt.last_read_at,
                  }
                : current,
            );
            setConversations((current) => {
              const nextConversations = current.map((conversation) =>
                conversation.id === preferredConversation.id
                  ? {
                      ...conversation,
                      unread_count: readReceipt.unread_count,
                      has_unread: readReceipt.has_unread,
                      last_read_message_id: readReceipt.last_read_message_id,
                      last_read_at: readReceipt.last_read_at,
                    }
                  : conversation,
              );
              setUnreadNotificationCount(sumUnreadCounts(nextConversations));
              return nextConversations;
            });
          }
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load messages.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [initialConversationId]);

  useEffect(() => {
    setActiveConversationId(selectedConversationId);
  }, [selectedConversationId, setActiveConversationId]);

  useEffect(() => {
    setLiveConnectionState(connectionState);
  }, [connectionState, setLiveConnectionState]);

  useEffect(() => {
    return () => {
      setActiveConversationId(null);
      setLiveConnectionState("idle");
    };
  }, [setActiveConversationId, setLiveConnectionState]);

  useEffect(() => {
    if (!lastJsonMessage || lastJsonMessage.type !== "thread.message.created") {
      return;
    }

    const incomingMessage = lastJsonMessage.message;
    const threadId = Number(lastJsonMessage.thread_id);

    if (!incomingMessage || threadId !== selectedConversationId) {
      return;
    }

    setMessages((current) => appendUniqueMessage(current, incomingMessage));
    setSelected((current) =>
      current && current.id === threadId
        ? {
            ...current,
            latest_message: incomingMessage,
            updated_at: incomingMessage.created_at,
            unread_count: 0,
            has_unread: false,
            last_read_message_id:
              incomingMessage.sender?.id === me?.id
                ? current.last_read_message_id
                : incomingMessage.id,
          }
        : current,
    );
    setConversations((current) =>
      {
        const nextConversations = updateConversationSummary(current, threadId, incomingMessage).map(
          (conversation) =>
            conversation.id === threadId
              ? {
                  ...conversation,
                  unread_count: 0,
                  has_unread: false,
                  last_read_message_id:
                    incomingMessage.sender?.id === me?.id
                      ? conversation.last_read_message_id
                      : incomingMessage.id,
                }
              : conversation,
        );
        setUnreadNotificationCount(sumUnreadCounts(nextConversations));
        return nextConversations;
      },
    );
    if (incomingMessage.sender?.id !== me?.id) {
      markConversationRead(threadId)
        .then((readReceipt) => {
          setConversations((current) => {
            const nextConversations = current.map((conversation) =>
              conversation.id === threadId
                ? {
                    ...conversation,
                    unread_count: readReceipt.unread_count,
                    has_unread: readReceipt.has_unread,
                    last_read_message_id: readReceipt.last_read_message_id,
                    last_read_at: readReceipt.last_read_at,
                  }
                : conversation,
            );
            setUnreadNotificationCount(sumUnreadCounts(nextConversations));
            return nextConversations;
          });
          setSelected((current) =>
            current && current.id === threadId
              ? {
                  ...current,
                  unread_count: readReceipt.unread_count,
                  has_unread: readReceipt.has_unread,
                  last_read_message_id: readReceipt.last_read_message_id,
                  last_read_at: readReceipt.last_read_at,
                }
              : current,
          );
        })
        .catch(() => {});
    }
  }, [lastJsonMessage, me?.id, selectedConversationId, setUnreadNotificationCount]);

  const openConversation = async (conversation) => {
    setSelected(conversation);
    setError("");
    try {
      const [threadDetails, nextMessages] = await Promise.all([
        fetchConversation(conversation.id),
        fetchMessages(conversation.id),
      ]);
      setSelected(threadDetails);
      setMessages(nextMessages);
      const readReceipt = await markConversationRead(threadDetails.id);
      const hydratedThreadDetails = {
        ...threadDetails,
        unread_count: readReceipt.unread_count,
        has_unread: readReceipt.has_unread,
        last_read_message_id: readReceipt.last_read_message_id,
        last_read_at: readReceipt.last_read_at,
      };
      setSelected(hydratedThreadDetails);
      setConversations((current) => {
        const nextConversations = current.map((item) =>
          item.id === threadDetails.id ? hydratedThreadDetails : item,
        );
        setUnreadNotificationCount(sumUnreadCounts(nextConversations));
        return nextConversations;
      });
    } catch (requestError) {
      setError(requestError.message || "Failed to open this conversation.");
    }
  };

  const submitMessage = async () => {
    if ((!newMessage.trim() && !resourceUrl.trim()) || !selected) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const message = await sendConversationMessage({
        conversationId: selected.id,
        content: newMessage.trim(),
        resourceUrl: resourceUrl.trim(),
        resourceLabel: resourceLabel.trim(),
      });

      const nextThread = await fetchConversation(selected.id);
      setMessages((current) => appendUniqueMessage(current, message));
      setConversations((current) =>
        {
          const nextConversations = current
          .map((conversation) => (conversation.id === selected.id ? nextThread : conversation))
          .sort(
            (left, right) =>
              new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
          );
          setUnreadNotificationCount(sumUnreadCounts(nextConversations));
          return nextConversations;
        },
      );
      setSelected(nextThread);
      setNewMessage("");
      setResourceUrl("");
      setResourceLabel("");
      setShowResourceFields(false);
    } catch (requestError) {
      setError(requestError.message || "Failed to send your message.");
    } finally {
      setSending(false);
    }
  };

  return {
    me,
    conversations,
    selected,
    setSelected,
    messages,
    newMessage,
    setNewMessage,
    resourceUrl,
    setResourceUrl,
    resourceLabel,
    setResourceLabel,
    showResourceFields,
    setShowResourceFields,
    connectionState,
    loading,
    sending,
    error,
    openConversation,
    submitMessage,
  };
}
