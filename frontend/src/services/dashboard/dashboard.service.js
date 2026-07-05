import { authService } from "@/services/auth/auth.service";
import { appClient } from "@/services/appClient";

export async function fetchDashboardData() {
  const user = await authService.me();
  const [enrollments, swaps, applications, rsvps] = await Promise.all([
    appClient.entities.Enrollment.filter({ user_id: user.id }, "-created_date", 20),
    appClient.entities.SkillSwap.list("-created_date", 20),
    appClient.entities.JobApplication.filter({ user_id: user.id }, "-created_date", 20),
    appClient.entities.RSVP.filter({ user_id: user.id }, "-created_date", 20),
  ]);

  return {
    user,
    enrollments,
    swaps,
    applications,
    rsvps,
  };
}
