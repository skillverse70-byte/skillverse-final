import { apiRequest, ApiError } from "@/lib/http-client";
import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

function normalizeOrganization(organization) {
  if (!organization) {
    return null;
  }

  return {
    id: organization.id,
    name: organization.name || "",
    type: organization.type || "",
    verification_status: organization.verification_status || "unverified",
  };
}

function normalizeOpportunity(opportunity) {
  const organization = normalizeOrganization(opportunity.organization);

  return {
    ...opportunity,
    organization,
    organization_id: organization?.id ?? null,
    organization_name: organization?.name ?? "",
    organization_verification_status:
      organization?.verification_status || "unverified",
    company_name: opportunity.company_name || organization?.name || "",
    title: opportunity.title || "",
    description: opportunity.description || "",
    type: opportunity.type || "job",
    status: opportunity.status || "open",
    category: opportunity.category || "",
    location: opportunity.location || "",
    is_remote: opportunity.is_remote ?? false,
    experience_level: opportunity.experience_level || "",
    salary_range: opportunity.salary_range || "",
    deadline: opportunity.deadline || null,
    required_skills: Array.isArray(opportunity.required_skills)
      ? opportunity.required_skills
      : [],
    field_signals: Array.isArray(opportunity.field_signals)
      ? opportunity.field_signals
      : [],
    application_count: opportunity.application_count ?? 0,
    viewer_application_status: opportunity.viewer_application_status || null,
  };
}

function normalizeApplication(application) {
  return {
    ...application,
    opportunity_id: application.opportunity_id ?? null,
    opportunity_title: application.opportunity_title || "",
    opportunity_type: application.opportunity_type || "job",
    company_name: application.company_name || "",
    status: application.status || "applied",
    cover_letter: application.cover_letter || "",
    reviewer_notes: application.reviewer_notes || "",
    deadline: application.deadline || null,
  };
}

function normalizeApplicant(application) {
  return {
    ...application,
    status: application.status || "applied",
    cover_letter: application.cover_letter || "",
    reviewer_notes: application.reviewer_notes || "",
    applicant: {
      id: application.applicant?.id ?? null,
      full_name: application.applicant?.full_name || "",
      email: application.applicant?.email || "",
    },
    opportunity: {
      id: application.opportunity?.id ?? null,
      title: application.opportunity?.title || "",
      type: application.opportunity?.type || "job",
    },
  };
}

export async function fetchPublicOpportunities(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.type) {
    searchParams.set("type", params.type);
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }

  const path = `/jobs/${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const opportunities = await apiRequest(path, { method: "GET" });
  return opportunities.map(normalizeOpportunity);
}

export async function fetchOpportunityDetail(opportunityId, { authenticated = false } = {}) {
  const request = authenticated ? authenticatedApiRequest : apiRequest;
  const opportunity = await request(`/jobs/${opportunityId}/`, { method: "GET" });
  return normalizeOpportunity(opportunity);
}

export async function applyToOpportunity(opportunityId, { coverLetter = "" } = {}) {
  const application = await authenticatedApiRequest(`/jobs/${opportunityId}/apply/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      cover_letter: coverLetter,
    }),
  });
  return normalizeApplication(application);
}

export async function fetchMyApplications() {
  const applications = await authenticatedApiRequest("/jobs/applications/", {
    method: "GET",
  });
  return applications.map(normalizeApplication);
}

export async function fetchOrganizationOpportunities() {
  const opportunities = await authenticatedApiRequest("/jobs/manage/", {
    method: "GET",
  });
  return opportunities.map(normalizeOpportunity);
}

export async function createOrganizationOpportunity(payload) {
  const opportunity = await authenticatedApiRequest("/jobs/manage/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeOpportunity(opportunity);
}

export async function updateOrganizationOpportunity(opportunityId, payload) {
  const opportunity = await authenticatedApiRequest(`/jobs/manage/${opportunityId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeOpportunity(opportunity);
}

export async function fetchOrganizationApplications({ opportunityId, status } = {}) {
  const searchParams = new URLSearchParams();
  if (opportunityId) {
    searchParams.set("opportunity_id", String(opportunityId));
  }
  if (status) {
    searchParams.set("status", status);
  }

  const applications = await authenticatedApiRequest(
    `/jobs/manage/applications/${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
    {
      method: "GET",
    },
  );
  return applications.map(normalizeApplicant);
}

export async function updateOrganizationApplicationStatus(
  applicationId,
  { status, reviewerNotes = "" },
) {
  const application = await authenticatedApiRequest(`/jobs/manage/applications/${applicationId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
      reviewer_notes: reviewerNotes,
    }),
  });
  return normalizeApplicant(application);
}

export { ApiError };
