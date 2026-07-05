import { authService } from "@/services/auth/auth.service";
import { appClient } from "@/services/appClient";

export async function fetchOrganizationProfileData() {
  const user = await authService.me();
  const organizations = await appClient.entities.Organization.filter({
    owner_id: user.id,
  });

  return {
    user,
    organization: organizations[0] || null,
  };
}

export async function saveOrganizationProfile({ organizationId, form, userId }) {
  if (organizationId) {
    return appClient.entities.Organization.update(organizationId, form);
  }

  return appClient.entities.Organization.create({
    ...form,
    owner_id: userId,
  });
}

export function uploadOrganizationLogo(file) {
  return appClient.integrations.Core.UploadFile({ file });
}

export async function fetchOrganizationManagementData() {
  const user = await authService.me();
  const organizations = await appClient.entities.Organization.filter({
    owner_id: user.id,
  });

  return {
    user,
    organizations,
  };
}
