import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
import { apiRequest } from "@/lib/http-client";

export async function fetchOrganizationProfileData() {
  const organization = await authenticatedApiRequest("/organizations/me/", {
    method: "GET",
  });

  return { organization };
}

function buildOrganizationFormData(form) {
  const formData = new FormData();
  const fields = [
    "name",
    "type",
    "description",
    "contact_email",
    "country",
    "location",
    "website_url",
    "contact_phone",
    "offerings_summary",
  ];

  fields.forEach((field) => {
    formData.append(field, form[field] || "");
  });

  if (form.business_license instanceof File) {
    formData.append("business_license", form.business_license);
  }

  return formData;
}

export async function saveOrganizationProfile({ form }) {
  return authenticatedApiRequest("/organizations/me/", {
    method: "PATCH",
    body: buildOrganizationFormData(form),
  });
}

export async function fetchOrganizationManagementData() {
  const organization = await authenticatedApiRequest("/organizations/me/", {
    method: "GET",
  });

  return { organization };
}

export async function fetchPublicOrganizationProfile(organizationId) {
  return apiRequest(`/organizations/${organizationId}/public/`, {
    method: "GET",
  });
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
