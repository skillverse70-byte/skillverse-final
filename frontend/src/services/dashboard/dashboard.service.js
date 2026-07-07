import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
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
  const payload = await authenticatedApiRequest("/dashboard/admin/", { method: "GET" });
  return normalizeAdminDashboard(payload);
}

