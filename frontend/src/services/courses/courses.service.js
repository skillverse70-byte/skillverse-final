import { authService } from "@/services/auth/auth.service";
import { appClient } from "@/services/appClient";

export async function fetchCourseBuilderData() {
  const user = await authService.me();
  const organizations = await appClient.entities.Organization.filter({
    owner_id: user.id,
  });
  const organization = organizations[0] || null;
  const courses = organization
    ? await appClient.entities.Course.filter(
        { organization_id: organization.id },
        "-created_date",
      )
    : [];

  return { user, organization, courses };
}

export function saveCourse({ course, payload, isNew }) {
  if (isNew) {
    return appClient.entities.Course.create(payload);
  }

  return appClient.entities.Course.update(course.id, payload);
}
