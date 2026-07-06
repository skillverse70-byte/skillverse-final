import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

export function fetchSessions({ swapRequestId } = {}) {
  const searchParams = new URLSearchParams();
  if (swapRequestId) {
    searchParams.set("swap_request", String(swapRequestId));
  }

  const queryString = searchParams.toString();
  return authenticatedApiRequest(
    `/sessions/${queryString ? `?${queryString}` : ""}`,
    { method: "GET" },
  );
}

export function createSession(payload) {
  return authenticatedApiRequest("/sessions/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function updateSession(sessionId, payload) {
  return authenticatedApiRequest(`/sessions/${sessionId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
