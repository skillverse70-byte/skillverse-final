import {
  createConversation,
  fetchConversations,
} from "@/services/messages/messages.service";

export async function ensureSwapConversation({
  swapRequestId = null,
}) {
  const { conversations } = await fetchConversations();

  const existingConversation = conversations.find(
    (conversation) => String(conversation.swap_request) === String(swapRequestId),
  );

  if (existingConversation) {
    return existingConversation;
  }

  return createConversation({ swapRequestId });
}
