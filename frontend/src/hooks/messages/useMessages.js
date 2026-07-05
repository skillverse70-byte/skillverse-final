import { useEffect, useState } from "react";
import {
  fetchConversations,
  fetchMessages,
  sendConversationMessage,
} from "@/services/messages/messages.service";

export function useMessages() {
  const [me, setMe] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchConversations();
        if (!active) {
          return;
        }
        setMe(data.user);
        setConversations(data.conversations);
      } catch (error) {
        console.error(error);
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
  }, []);

  const openConversation = async (conversation) => {
    setSelected(conversation);
    try {
      const nextMessages = await fetchMessages(conversation.id);
      setMessages(nextMessages);
    } catch (error) {
      console.error(error);
    }
  };

  const submitMessage = async () => {
    if (!newMessage.trim() || !selected || !me) {
      return;
    }

    try {
      const message = await sendConversationMessage({
        userId: me.id,
        conversationId: selected.id,
        content: newMessage.trim(),
      });
      setMessages((current) => [...current, message]);
      setNewMessage("");
    } catch (error) {
      console.error(error);
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
    loading,
    openConversation,
    submitMessage,
  };
}
