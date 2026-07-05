import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

export function fetchSkillPortfolioData() {
  return authenticatedApiRequest("/profile/skills/", { method: "GET" });
}

export function fetchSkillCatalog() {
  return authenticatedApiRequest("/skills/catalog/", { method: "GET" });
}

export function fetchMatchSuggestions() {
  return authenticatedApiRequest("/swaps/match-suggestions/", { method: "GET" });
}

export function fetchSwapRequests() {
  return authenticatedApiRequest("/swaps/requests/", { method: "GET" });
}

export function createSwapRequest(payload) {
  return authenticatedApiRequest("/swaps/requests/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function acceptSwapRequest(id, note = "") {
  return authenticatedApiRequest(`/swaps/requests/${id}/accept/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ note }),
  });
}

export function rejectSwapRequest(id, note = "") {
  return authenticatedApiRequest(`/swaps/requests/${id}/reject/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ note }),
  });
}

export function cancelSwapRequest(id, note = "") {
  return authenticatedApiRequest(`/swaps/requests/${id}/cancel/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ note }),
  });
}

export function createUserSkill(payload) {
  return authenticatedApiRequest("/profile/skills/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function updateUserSkill(id, updates) {
  return authenticatedApiRequest(`/profile/skills/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
}

export function deleteUserSkill(id) {
  return authenticatedApiRequest(`/profile/skills/${id}/`, {
    method: "DELETE",
  });
}
