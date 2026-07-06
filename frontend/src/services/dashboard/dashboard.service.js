import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
import { fetchLearnerEnrollments } from "@/services/courses/courses.service";

export async function fetchDashboardData() {
  const [user, sessions, enrollments] = await Promise.all([
    authenticatedApiRequest("/auth/me/", { method: "GET" }),
    authenticatedApiRequest("/sessions/", { method: "GET" }),
    fetchLearnerEnrollments(),
  ]);

  return {
    user,
    sessions,
    enrollments,
    applications: [],
    rsvps: [],
  };
}
