import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
import {
  normalizeCourse,
  normalizeInstructorInvitation,
} from "@/services/courses/courses.service";
import { normalizeOpportunity } from "@/services/jobs/jobs.service";

function buildSearchParams(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export function normalizeAdminUser(user = {}) {
  return {
    ...user,
    id: user.id ?? null,
    email: user.email || "",
    full_name: user.full_name || "",
    role: user.role || "regular_user",
    is_active: Boolean(user.is_active),
    is_staff: Boolean(user.is_staff),
    is_superuser: Boolean(user.is_superuser),
    is_email_verified: Boolean(user.is_email_verified),
    date_joined: user.date_joined || null,
    last_login: user.last_login || null,
  };
}

export function normalizeAdminOrganization(organization = {}) {
  return {
    ...organization,
    id: organization.id ?? null,
    name: organization.name || "",
    type: organization.type || "",
    verification_status: organization.verification_status || "unverified",
    contact_email: organization.contact_email || "",
    country: organization.country || "",
    location: organization.location || "",
    owner_email: organization.owner_email || "",
    owner_full_name: organization.owner_full_name || "",
    is_suspended: Boolean(organization.is_suspended),
    suspension_reason: organization.suspension_reason || "",
    moderated_at: organization.moderated_at || null,
    updated_at: organization.updated_at || null,
  };
}

export function normalizeAdminCourse(course = {}) {
  return {
    ...normalizeCourse(course),
    organization_name: course.organization_name || "",
    organization_verification_status:
      course.organization_verification_status || "unverified",
    admin_review_notes: course.admin_review_notes || "",
    admin_reviewed_at: course.admin_reviewed_at || null,
    enrollment_open: course.enrollment_open ?? true,
  };
}

export function normalizeAdminJob(job = {}) {
  return {
    ...normalizeOpportunity(job),
    organization_name: job.organization_name || "",
    organization_verification_status:
      job.organization_verification_status || "unverified",
    admin_review_notes: job.admin_review_notes || "",
    admin_reviewed_at: job.admin_reviewed_at || null,
  };
}

export function normalizeTaxonomySuggestion(suggestion = {}) {
  return {
    ...suggestion,
    id: suggestion.id ?? null,
    domain: suggestion.domain || "",
    name: suggestion.name || "",
    normalized_slug: suggestion.normalized_slug || "",
    description: suggestion.description || "",
    status: suggestion.status || "pending",
    suggested_by: {
      id: suggestion.suggested_by?.id ?? null,
      full_name: suggestion.suggested_by?.full_name || "",
      email: suggestion.suggested_by?.email || "",
    },
    organization: suggestion.organization
      ? {
          id: suggestion.organization.id ?? null,
          name: suggestion.organization.name || "",
          type: suggestion.organization.type || "",
        }
      : null,
    reviewer_notes: suggestion.reviewer_notes || "",
    resolved_entry_name: suggestion.resolved_entry_name || "",
    resolved_entry_slug: suggestion.resolved_entry_slug || "",
    created_at: suggestion.created_at || null,
    reviewed_at: suggestion.reviewed_at || null,
  };
}

export function normalizeTaxonomyCatalogEntry(entry = {}) {
  return {
    ...entry,
    id: entry.id ?? null,
    domain: entry.domain || "",
    name: entry.name || "",
    slug: entry.slug || "",
    description: entry.description || "",
    is_active: Boolean(entry.is_active),
    created_at: entry.created_at || null,
    updated_at: entry.updated_at || null,
  };
}

export function normalizeAdminAuditLog(log = {}) {
  return {
    ...log,
    id: log.id ?? null,
    actor: log.actor ?? null,
    actor_email: log.actor_email || "",
    actor_full_name: log.actor_full_name || "",
    actor_role: log.actor_role || "",
    action: log.action || "",
    target_type: log.target_type || "",
    target_id: log.target_id ?? null,
    summary: log.summary || "",
    metadata:
      log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
        ? log.metadata
        : {},
    created_at: log.created_at || null,
  };
}

export function normalizeAdminCourseInstructorInvitation(invitation = {}) {
  return {
    ...normalizeInstructorInvitation(invitation),
    course_program: invitation.course_program ?? null,
    course_title: invitation.course_title || "",
    organization_id: invitation.organization_id ?? null,
    organization_name: invitation.organization_name || "",
    invited_by_email: invitation.invited_by_email || "",
    invited_by_name: invitation.invited_by_name || "",
    invited_user_email: invitation.invited_user_email || "",
    invited_user_name: invitation.invited_user_name || "",
  };
}

export async function fetchAdminUsers(params = {}) {
  const query = buildSearchParams({
    role: params.role,
    is_active: params.isActive,
  });
  const users = await authenticatedApiRequest(
    `/admin/users/${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return Array.isArray(users) ? users.map(normalizeAdminUser) : [];
}

export async function decideAdminUser(userId, { isActive, reason = "" }) {
  const user = await authenticatedApiRequest(`/admin/users/${userId}/decision/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      is_active: isActive,
      reason,
    }),
  });
  return normalizeAdminUser(user);
}

export async function fetchAdminOrganizations(params = {}) {
  const query = buildSearchParams({
    verification_status: params.verificationStatus,
    is_suspended: params.isSuspended,
  });
  const organizations = await authenticatedApiRequest(
    `/admin/organizations/moderation/${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return Array.isArray(organizations)
    ? organizations.map(normalizeAdminOrganization)
    : [];
}

export async function decideAdminOrganizationModeration(
  organizationId,
  { isSuspended, suspensionReason = "" },
) {
  const organization = await authenticatedApiRequest(
    `/admin/organizations/moderation/${organizationId}/decision/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        is_suspended: isSuspended,
        suspension_reason: suspensionReason,
      }),
    },
  );
  return normalizeAdminOrganization(organization);
}

export async function fetchAdminCourses(params = {}) {
  const query = buildSearchParams({
    status: params.status,
    organization_id: params.organizationId,
  });
  const courses = await authenticatedApiRequest(
    `/admin/courses/${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return Array.isArray(courses) ? courses.map(normalizeAdminCourse) : [];
}

export async function fetchAdminCourseInstructorInvitations(params = {}) {
  const query = buildSearchParams({
    status: params.status,
    organization_id: params.organizationId,
    course_program_id: params.courseProgramId,
    search: params.search,
  });
  const invitations = await authenticatedApiRequest(
    `/admin/course-instructor-invitations/${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return Array.isArray(invitations)
    ? invitations.map(normalizeAdminCourseInstructorInvitation)
    : [];
}

export async function decideAdminCourse(
  courseId,
  { status, enrollmentOpen, reviewNotes = "" } = {},
) {
  const payload = {};
  if (status) {
    payload.status = status;
  }
  if (typeof enrollmentOpen === "boolean") {
    payload.enrollment_open = enrollmentOpen;
  }
  if (reviewNotes !== undefined) {
    payload.review_notes = reviewNotes;
  }

  const course = await authenticatedApiRequest(`/admin/courses/${courseId}/decision/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeAdminCourse(course);
}

export async function fetchAdminJobs(params = {}) {
  const query = buildSearchParams({
    status: params.status,
    organization_id: params.organizationId,
  });
  const jobs = await authenticatedApiRequest(
    `/admin/jobs/${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return Array.isArray(jobs) ? jobs.map(normalizeAdminJob) : [];
}

export async function decideAdminJob(jobId, { status, reviewNotes = "" } = {}) {
  const payload = {};
  if (status) {
    payload.status = status;
  }
  if (reviewNotes !== undefined) {
    payload.review_notes = reviewNotes;
  }

  const job = await authenticatedApiRequest(`/admin/jobs/${jobId}/decision/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeAdminJob(job);
}

export async function fetchAdminTaxonomySuggestions(params = {}) {
  const query = buildSearchParams({
    status: params.status,
    domain: params.domain,
  });
  const suggestions = await authenticatedApiRequest(
    `/admin/taxonomy/suggestions/${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return Array.isArray(suggestions)
    ? suggestions.map(normalizeTaxonomySuggestion)
    : [];
}

export async function decideAdminTaxonomySuggestion(
  suggestionId,
  { decision, reviewerNotes = "" },
) {
  const suggestion = await authenticatedApiRequest(
    `/admin/taxonomy/suggestions/${suggestionId}/decision/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        decision,
        reviewer_notes: reviewerNotes,
      }),
    },
  );
  return normalizeTaxonomySuggestion(suggestion);
}

export async function fetchAdminTaxonomyCatalog(params = {}) {
  const query = buildSearchParams({
    domain: params.domain,
    active_only: params.activeOnly,
  });
  const entries = await authenticatedApiRequest(
    `/admin/taxonomy/catalog/${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return Array.isArray(entries)
    ? entries.map(normalizeTaxonomyCatalogEntry)
    : [];
}

export async function createAdminTaxonomyCatalogEntry({
  domain,
  name,
  description = "",
  isActive = true,
}) {
  const entry = await authenticatedApiRequest("/admin/taxonomy/catalog/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain,
      name,
      description,
      is_active: isActive,
    }),
  });
  return normalizeTaxonomyCatalogEntry(entry);
}

export async function updateAdminTaxonomyCatalogEntry(
  domain,
  entryId,
  { name, description, isActive } = {},
) {
  const payload = {};
  if (name !== undefined) {
    payload.name = name;
  }
  if (description !== undefined) {
    payload.description = description;
  }
  if (typeof isActive === "boolean") {
    payload.is_active = isActive;
  }

  const entry = await authenticatedApiRequest(
    `/admin/taxonomy/catalog/${domain}/${entryId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  return normalizeTaxonomyCatalogEntry(entry);
}

export async function fetchAdminAuditLogs(params = {}) {
  const query = buildSearchParams({
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId,
    actor_id: params.actorId,
    search: params.search,
    created_after: params.createdAfter,
    created_before: params.createdBefore,
  });
  const logs = await authenticatedApiRequest(
    `/admin/audit/logs/${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return Array.isArray(logs) ? logs.map(normalizeAdminAuditLog) : [];
}

export async function fetchAdminAuditLogDetail(logId) {
  const log = await authenticatedApiRequest(`/admin/audit/logs/${logId}/`, {
    method: "GET",
  });
  return normalizeAdminAuditLog(log);
}
