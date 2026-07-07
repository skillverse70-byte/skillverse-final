import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
import { apiRequest } from "@/lib/http-client";

export async function fetchOrganizationProfileData() {
  const [organization, financialAccount] = await Promise.all([
    authenticatedApiRequest("/organizations/me/", {
      method: "GET",
    }),
    authenticatedApiRequest("/payments/financial-account/me/", {
      method: "GET",
    }),
  ]);

  return { organization, financialAccount };
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
  const [organization, verification, financialAccount, courses, enrollments] = await Promise.all([
    authenticatedApiRequest("/organizations/me/", {
      method: "GET",
    }),
    authenticatedApiRequest("/organizations/verification/me/", {
      method: "GET",
    }),
    authenticatedApiRequest("/payments/financial-account/me/", {
      method: "GET",
    }),
    authenticatedApiRequest("/courses/manage/", {
      method: "GET",
    }),
    authenticatedApiRequest("/courses/manage/enrollments/", {
      method: "GET",
    }),
  ]);

  return { organization, verification, financialAccount, courses, enrollments };
}

export async function saveFinancialAccountSetup(form) {
  return authenticatedApiRequest("/payments/financial-account/me/", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(form),
  });
}

export async function fetchPublicOrganizationProfile(organizationId) {
  return apiRequest(`/organizations/${organizationId}/public/`, {
    method: "GET",
  });
}

export async function fetchOrganizationVerificationOverview() {
  return authenticatedApiRequest("/organizations/verification/me/", {
    method: "GET",
  });
}

export async function submitOrganizationVerificationRequest({ requestNotes = "" }) {
  return authenticatedApiRequest("/organizations/verification/submit/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request_notes: requestNotes,
    }),
  });
}

export async function fetchAdminOrganizationVerificationRequests({ status } = {}) {
  const searchParams = new URLSearchParams();
  if (status) {
    searchParams.set("status", status);
  }

  return authenticatedApiRequest(
    `/admin/organizations/verification-requests/${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`,
    { method: "GET" },
  );
}

export async function decideAdminOrganizationVerificationRequest(
  requestId,
  { decision, reviewerNotes = "", useAdminOverride = false },
) {
  return authenticatedApiRequest(
    `/admin/organizations/verification-requests/${requestId}/decision/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        decision,
        reviewer_notes: reviewerNotes,
        use_admin_override: useAdminOverride,
      }),
    },
  );
}

export async function fetchAdminFinancialAccounts({ status } = {}) {
  const searchParams = new URLSearchParams();
  if (status) {
    searchParams.set("status", status);
  }

  return authenticatedApiRequest(
    `/admin/payments/financial-accounts/${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`,
    { method: "GET" },
  );
}

export async function decideAdminFinancialAccount(
  financialAccountId,
  { decision, reviewNotes = "", restrictedReason = "" },
) {
  return authenticatedApiRequest(
    `/admin/payments/financial-accounts/${financialAccountId}/decision/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        decision,
        review_notes: reviewNotes,
        restricted_reason: restrictedReason,
      }),
    },
  );
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
