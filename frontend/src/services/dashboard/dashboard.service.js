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

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeAnalyticsCountItem(item = {}) {
  return {
    key: item.key || "",
    label: item.label || item.key || "Unknown",
    count: Number(item.count || 0),
  };
}

function normalizeInsightCard(item = {}) {
  return {
    key: item.key || "",
    severity: item.severity || "info",
    title: item.title || "Insight",
    description: item.description || "",
    route: item.route || "",
  };
}

function normalizeFeatureRollout(item = {}) {
  return {
    key: item.key || "",
    label: item.label || item.key || "Feature",
    enabled: Boolean(item.enabled),
    rollout_state: item.rollout_state || "disabled",
    actor_roles: ensureArray(item.actor_roles),
    surfaces: ensureArray(item.surfaces),
  };
}

function normalizeSystemHealth(payload = {}) {
  return {
    provider: payload.provider || {},
    feature_rollouts: ensureArray(payload.feature_rollouts).map(normalizeFeatureRollout),
    ready_features: Number(payload.ready_features || 0),
    fallback_only_features: Number(payload.fallback_only_features || 0),
    disabled_features: Number(payload.disabled_features || 0),
    recent_match_suggestions_7d: Number(payload.recent_match_suggestions_7d || 0),
    recent_checkins_7d: Number(payload.recent_checkins_7d || 0),
    recent_enrollments_7d: Number(payload.recent_enrollments_7d || 0),
    recent_rsvps_7d: Number(payload.recent_rsvps_7d || 0),
    recent_applications_7d: Number(payload.recent_applications_7d || 0),
    verification_status: payload.verification_status || "",
    financial_account_status: payload.financial_account_status || "",
  };
}

function normalizeKnowledgeTrends(payload = {}) {
  return {
    top_fields: ensureArray(payload.top_fields).map(normalizeAnalyticsCountItem),
    top_offered_skills: ensureArray(payload.top_offered_skills).map(normalizeAnalyticsCountItem),
    top_learning_skills: ensureArray(payload.top_learning_skills).map(normalizeAnalyticsCountItem),
    top_course_categories: ensureArray(payload.top_course_categories).map(
      normalizeAnalyticsCountItem,
    ),
    top_event_categories: ensureArray(payload.top_event_categories).map(
      normalizeAnalyticsCountItem,
    ),
    top_opportunity_categories: ensureArray(payload.top_opportunity_categories).map(
      normalizeAnalyticsCountItem,
    ),
  };
}

function normalizeOrganizationAnalytics(payload = {}) {
  return {
    summary: payload.summary || {},
    course_category_distribution: ensureArray(payload.course_category_distribution).map(
      normalizeAnalyticsCountItem,
    ),
    learner_progress_bands: ensureArray(payload.learner_progress_bands).map(
      normalizeAnalyticsCountItem,
    ),
    event_engagement: {
      rsvp_status_distribution: ensureArray(payload.event_engagement?.rsvp_status_distribution).map(
        normalizeAnalyticsCountItem,
      ),
      format_distribution: ensureArray(payload.event_engagement?.format_distribution).map(
        normalizeAnalyticsCountItem,
      ),
      attendance_rate_percent: Number(payload.event_engagement?.attendance_rate_percent || 0),
    },
    opportunity_pipeline: {
      application_status_distribution: ensureArray(
        payload.opportunity_pipeline?.application_status_distribution,
      ).map(normalizeAnalyticsCountItem),
      shortlisted_rate_percent: Number(
        payload.opportunity_pipeline?.shortlisted_rate_percent || 0,
      ),
      hired_rate_percent: Number(payload.opportunity_pipeline?.hired_rate_percent || 0),
    },
    knowledge_trends: normalizeKnowledgeTrends(payload.knowledge_trends),
    social_impact_heatmap: ensureArray(payload.social_impact_heatmap),
    matching_quality: payload.matching_quality || {},
    system_health: normalizeSystemHealth(payload.system_health),
    insight_cards: ensureArray(payload.insight_cards).map(normalizeInsightCard),
  };
}

function normalizeAdminAnalytics(payload = {}) {
  return {
    summary: payload.summary || {},
    matching_quality: {
      ...payload.matching_quality,
      score_distribution: ensureArray(payload.matching_quality?.score_distribution).map(
        normalizeAnalyticsCountItem,
      ),
    },
    adaptive_monitoring: {
      summary: payload.adaptive_monitoring?.summary || {},
      signal_counts: ensureArray(payload.adaptive_monitoring?.signal_counts).map(
        normalizeAnalyticsCountItem,
      ),
      mood_distribution: ensureArray(payload.adaptive_monitoring?.mood_distribution).map(
        normalizeAnalyticsCountItem,
      ),
      surface_distribution: ensureArray(payload.adaptive_monitoring?.surface_distribution).map(
        normalizeAnalyticsCountItem,
      ),
      average_focus_level: Number(payload.adaptive_monitoring?.average_focus_level || 0),
      average_energy_level: Number(payload.adaptive_monitoring?.average_energy_level || 0),
      average_stress_level: Number(payload.adaptive_monitoring?.average_stress_level || 0),
      recent_checkins_7d: Number(payload.adaptive_monitoring?.recent_checkins_7d || 0),
    },
    system_health: normalizeSystemHealth(payload.system_health),
    session_coordination_analytics: payload.session_coordination_analytics || {},
    global_knowledge_trends: normalizeKnowledgeTrends(payload.global_knowledge_trends),
    social_impact_heatmap: ensureArray(payload.social_impact_heatmap),
    insight_cards: ensureArray(payload.insight_cards).map(normalizeInsightCard),
  };
}

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
    analytics: normalizeOrganizationAnalytics(payload.analytics),
  };
}

function normalizeAdminDashboard(payload = {}) {
  return {
    summary: payload.summary || {},
    oversight: payload.oversight || {},
    adaptiveMonitoring: payload.adaptive_monitoring || {},
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
    analytics: normalizeAdminAnalytics(payload.analytics),
  };
}

export async function fetchRegularDashboardData() {
  const payload = await authenticatedApiRequest("/dashboard/me/", { method: "GET" });
  return normalizeRegularDashboard(payload);
}

export async function fetchOrganizationDashboardData() {
  const [dashboardPayload, analyticsPayload] = await Promise.all([
    authenticatedApiRequest("/dashboard/organization/", {
      method: "GET",
    }),
    authenticatedApiRequest("/dashboard/organization/analytics/", {
      method: "GET",
    }),
  ]);
  return normalizeOrganizationDashboard({
    ...dashboardPayload,
    analytics: analyticsPayload,
  });
}

export async function fetchAdminDashboardData() {
  const [
    dashboardPayload,
    analyticsPayload,
    users,
    moderatedOrganizations,
    courses,
    jobs,
    taxonomySuggestions,
    taxonomyCatalog,
    auditLogs,
  ] = await Promise.all([
    authenticatedApiRequest("/dashboard/admin/", { method: "GET" }),
    authenticatedApiRequest("/dashboard/admin/analytics/", { method: "GET" }),
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
    analytics: analyticsPayload,
    users,
    moderated_organizations: moderatedOrganizations,
    courses,
    jobs,
    taxonomy_suggestions: taxonomySuggestions,
    taxonomy_catalog: taxonomyCatalog,
    audit_logs: auditLogs,
  });
}
