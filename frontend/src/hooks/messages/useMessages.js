import { useEffect, useState } from "react";
import {
  fetchConversation,
  fetchConversations,
  fetchMessages,
  sendConversationMessage,
} from "@/services/messages/messages.service";

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
      setMessages((current) => [...current, message]);
      setConversations((current) =>
        current
          .map((conversation) =>
            conversation.id === selected.id
              ? nextThread
              : conversation,
          )
          .sort(
            (left, right) =>
              new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
          ),
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
    loading,
    sending,
    error,
    openConversation,
    submitMessage,
  };
}
