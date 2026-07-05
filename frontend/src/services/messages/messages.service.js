import { authService } from "@/services/auth/auth.service";
import { appClient } from "@/services/appClient";

export async function fetchConversations() {
  const user = await authService.me();
  const conversations = await appClient.entities.Conversation.list(
    "-last_message_date",
    50,
  );

  return { user, conversations };
}

export function fetchMessages(conversationId) {
  return appClient.entities.Message.filter(
    { conversation_id: conversationId },
    "created_date",
    100,
  );
}

export function sendConversationMessage({ userId, conversationId, content }) {
  return appClient.entities.Message.create({
    sender_id: userId,
    conversation_id: conversationId,
    content,
  });
}
