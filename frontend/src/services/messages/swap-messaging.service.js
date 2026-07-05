import { authService } from "@/services/auth/auth.service";
import { appClient } from "@/services/appClient";

function buildConversationTitle(counterpartyName) {
  return `Skill swap with ${counterpartyName || "partner"}`;
}

function buildStarterPreview(exchangeSummary) {
  return exchangeSummary || "Start coordinating your skill swap here.";
}

export async function ensureSwapConversation({
  counterparty,
  exchangeSummary = "",
  swapRequestId = null,
}) {
  const me = await authService.me();
  const conversations = await appClient.entities.Conversation.list(
    "-last_message_date",
    100,
  );

  const existingConversation = conversations.find((conversation) => {
    const participants = conversation.participant_ids || [];
    return (
      participants.includes(me.id) &&
      participants.includes(counterparty.id)
    );
  });

  if (existingConversation) {
    return existingConversation;
  }

  return appClient.entities.Conversation.create({
    participant_ids: [me.id, counterparty.id],
    participant_names: [
      me.full_name || me.email || "You",
      counterparty.full_name || "Swap partner",
    ],
    title: buildConversationTitle(counterparty.full_name),
    last_message: buildStarterPreview(exchangeSummary),
    last_message_preview: buildStarterPreview(exchangeSummary),
    last_message_date: new Date().toISOString(),
    swap_request_id: swapRequestId,
    swap_exchange_summary: exchangeSummary,
  });
}
