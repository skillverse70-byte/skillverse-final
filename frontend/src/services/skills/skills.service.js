import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

export function fetchSkillPortfolioData() {
  return authenticatedApiRequest("/profile/skills/", { method: "GET" });
}

export function fetchSkillCatalog() {
  return authenticatedApiRequest("/skills/catalog/", { method: "GET" });
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
