import { authService } from "@/services/auth/auth.service";
import { appClient } from "@/services/appClient";
import { apiRequest } from "@/lib/http-client";

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

export async function registerOrganization({
  organizationName,
  organizationType,
  email,
  password,
  description,
  country,
  location,
  businessLicense,
}) {
  const formData = new FormData();
  formData.append("organization_name", organizationName);
  formData.append("organization_type", organizationType);
  formData.append("email", email);
  formData.append("password", password);
  formData.append("description", description);
  formData.append("country", country || "");
  formData.append("location", location || "");
  if (businessLicense) {
    formData.append("business_license", businessLicense);
  }

  return apiRequest("/auth/organizations/register/", {
    method: "POST",
    body: formData,
  });
}
