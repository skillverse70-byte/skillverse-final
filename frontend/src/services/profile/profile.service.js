import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

export function fetchProfileData() {
  return authenticatedApiRequest("/profile/me/", { method: "GET" });
}

export function saveProfile(form) {
  return authenticatedApiRequest("/profile/me/", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      full_name: form.full_name,
      bio: form.bio,
      interests_summary: form.interests_summary,
      experience_level: form.experience_level,
    }),
  });
}

export function fetchFieldInterestCatalog() {
  return authenticatedApiRequest("/fields/catalog/", { method: "GET" });
}

export function addFieldInterest(payload) {
  return authenticatedApiRequest("/profile/fields/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function removeFieldInterest(id) {
  return authenticatedApiRequest(`/profile/fields/${id}/`, {
    method: "DELETE",
  });
}
