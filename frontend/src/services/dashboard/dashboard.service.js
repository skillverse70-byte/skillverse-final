import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

export async function fetchDashboardData() {
  const [user, sessions] = await Promise.all([
    authenticatedApiRequest("/auth/me/", { method: "GET" }),
    authenticatedApiRequest("/sessions/", { method: "GET" }),
  ]);

  return {
    user,
    sessions,
    applications: [],
    rsvps: [],
  };
}
