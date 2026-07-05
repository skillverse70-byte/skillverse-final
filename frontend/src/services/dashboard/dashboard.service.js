import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

export async function fetchDashboardData() {
  const user = await authenticatedApiRequest("/auth/me/", { method: "GET" });

  return {
    user,
    enrollments: [],
    applications: [],
    rsvps: [],
  };
}
