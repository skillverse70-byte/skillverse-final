import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
import {
  fetchAdminAuditLogs,
  fetchAdminCourses,
  fetchAdminJobs,
  fetchAdminOrganizations,
  fetchAdminTaxonomyCatalog,
  fetchAdminTaxonomySuggestions,
  fetchAdminUsers,
} from "@/services/admin/admin-governance.service";
import {
  normalizeCourse,
  normalizeEnrollment,
} from "@/services/courses/courses.service";
import { normalizeEvent, normalizeRsvp } from "@/services/events/events.service";
import {
  normalizeApplicant,
  normalizeApplication,
  normalizeOpportunity,
} from "@/services/jobs/jobs.service";

function normalizeRegularDashboard(payload = {}) {
  return {
    user: payload.user || null,
    stats: payload.stats || {},
    recommendationSignals: payload.recommendation_signals || {},
    enrollments: Array.isArray(payload.enrollments)
      ? payload.enrollments.map(normalizeEnrollment)
      : [],
    sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
    swapRequests: Array.isArray(payload.swap_requests) ? payload.swap_requests : [],
    applications: Array.isArray(payload.applications)
      ? payload.applications.map(normalizeApplication)
      : [],
    rsvps: Array.isArray(payload.rsvps) ? payload.rsvps.map(normalizeRsvp) : [],
  };
}

function normalizeOrganizationDashboard(payload = {}) {
  return {
    organization: payload.organization || null,
    verification: payload.verification || null,
    financialAccount: payload.financial_account || null,
    stats: payload.stats || {},
    coursePerformance: Array.isArray(payload.course_performance)
      ? payload.course_performance
      : [],
    courses: Array.isArray(payload.courses) ? payload.courses.map(normalizeCourse) : [],
    enrollments: Array.isArray(payload.enrollments)
      ? payload.enrollments.map(normalizeEnrollment)
      : [],
    events: Array.isArray(payload.events) ? payload.events.map(normalizeEvent) : [],
    opportunities: Array.isArray(payload.opportunities)
      ? payload.opportunities.map(normalizeOpportunity)
      : [],
    applications: Array.isArray(payload.applications)
      ? payload.applications.map(normalizeApplicant)
      : [],
  };
}

function normalizeAdminDashboard(payload = {}) {
  return {
    summary: payload.summary || {},
    oversight: payload.oversight || {},
    organizationVerificationRequests: Array.isArray(payload.organization_verification_requests)
      ? payload.organization_verification_requests
      : [],
    financialAccounts: Array.isArray(payload.financial_accounts)
      ? payload.financial_accounts
      : [],
    events: Array.isArray(payload.events) ? payload.events.map(normalizeEvent) : [],
    users: Array.isArray(payload.users) ? payload.users : [],
    moderatedOrganizations: Array.isArray(payload.moderated_organizations)
      ? payload.moderated_organizations
      : [],
    courses: Array.isArray(payload.courses) ? payload.courses : [],
    jobs: Array.isArray(payload.jobs) ? payload.jobs : [],
    taxonomySuggestions: Array.isArray(payload.taxonomy_suggestions)
      ? payload.taxonomy_suggestions
      : [],
    taxonomyCatalog: Array.isArray(payload.taxonomy_catalog)
      ? payload.taxonomy_catalog
      : [],
    auditLogs: Array.isArray(payload.audit_logs) ? payload.audit_logs : [],
  };
}

export async function fetchRegularDashboardData() {
  const payload = await authenticatedApiRequest("/dashboard/me/", { method: "GET" });
  return normalizeRegularDashboard(payload);
}

export async function fetchOrganizationDashboardData() {
  const payload = await authenticatedApiRequest("/dashboard/organization/", {
    method: "GET",
  });
  return normalizeOrganizationDashboard(payload);
}

export async function fetchAdminDashboardData() {
  const [
    dashboardPayload,
    users,
    moderatedOrganizations,
    courses,
    jobs,
    taxonomySuggestions,
    taxonomyCatalog,
    auditLogs,
  ] = await Promise.all([
    authenticatedApiRequest("/dashboard/admin/", { method: "GET" }),
    fetchAdminUsers(),
    fetchAdminOrganizations(),
    fetchAdminCourses(),
    fetchAdminJobs(),
    fetchAdminTaxonomySuggestions(),
    fetchAdminTaxonomyCatalog(),
    fetchAdminAuditLogs(),
  ]);

  return normalizeAdminDashboard({
    ...dashboardPayload,
    users,
    moderated_organizations: moderatedOrganizations,
    courses,
    jobs,
    taxonomy_suggestions: taxonomySuggestions,
    taxonomy_catalog: taxonomyCatalog,
    audit_logs: auditLogs,
  });
}
