import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

export async function fetchConversations() {
  const [user, conversations] = await Promise.all([
    authenticatedApiRequest("/auth/me/", { method: "GET" }),
    authenticatedApiRequest("/messages/threads/", { method: "GET" }),
  ]);

  return { user, conversations };
}

export function fetchConversation(conversationId) {
  return authenticatedApiRequest(`/messages/threads/${conversationId}/`, {
    method: "GET",
  });
}

export function fetchMessages(conversationId) {
  return authenticatedApiRequest(`/messages/threads/${conversationId}/messages/`, {
    method: "GET",
  });
}

export function createConversation({ swapRequestId }) {
  return authenticatedApiRequest("/messages/threads/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ swap_request_id: swapRequestId }),
  });
}

export function sendConversationMessage({
  conversationId,
  content,
  resourceUrl = "",
  resourceLabel = "",
}) {
  return authenticatedApiRequest(`/messages/threads/${conversationId}/messages/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      resource_url: resourceUrl,
      resource_label: resourceLabel,
    }),
  });
}
