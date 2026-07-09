import { normalizeAICapabilitySnapshot } from "@/lib/ai-capabilities";
import { aiRolloutStates, roles } from "@/lib/domain-enums";
import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
import { normalizeCourse } from "@/services/courses/courses.service";
import { normalizeEvent } from "@/services/events/events.service";
import { normalizeOpportunity } from "@/services/jobs/jobs.service";

export async function fetchAICapabilitySnapshot() {
  const payload = await authenticatedApiRequest("/ai/capabilities/", {
    method: "GET",
  });
  return normalizeAICapabilitySnapshot(payload);
}

function normalizePeerRecommendation(item = {}) {
  return {
    used_ai: Boolean(item.used_ai),
    score: Number(item.score || 0),
    rationale: item.rationale || "",
    source_signals:
      item.source_signals && typeof item.source_signals === "object"
        ? item.source_signals
        : {},
    match: item.match || null,
  };
}

function normalizeSkillRecommendation(item = {}) {
  return {
    used_ai: Boolean(item.used_ai),
    score: Number(item.score || 0),
    rationale: item.rationale || "",
    source_signals:
      item.source_signals && typeof item.source_signals === "object"
        ? item.source_signals
        : {},
    skill: item.skill || { name: "", slug: "" },
  };
}

function normalizeCourseRecommendation(item = {}) {
  return {
    used_ai: Boolean(item.used_ai),
    score: Number(item.score || 0),
    rationale: item.rationale || "",
    source_signals:
      item.source_signals && typeof item.source_signals === "object"
        ? item.source_signals
        : {},
    course: normalizeCourse(item.course || {}),
  };
}

function normalizeEventRecommendation(item = {}) {
  return {
    used_ai: Boolean(item.used_ai),
    score: Number(item.score || 0),
    rationale: item.rationale || "",
    source_signals:
      item.source_signals && typeof item.source_signals === "object"
        ? item.source_signals
        : {},
    event: normalizeEvent(item.event || {}),
  };
}

function normalizeOpportunityRecommendation(item = {}) {
  return {
    used_ai: Boolean(item.used_ai),
    score: Number(item.score || 0),
    rationale: item.rationale || "",
    source_signals:
      item.source_signals && typeof item.source_signals === "object"
        ? item.source_signals
        : {},
    opportunity: normalizeOpportunity(item.opportunity || {}),
  };
}

export function normalizeAIRecommendationFeed(payload = {}) {
  return {
    provider: payload.provider || "openrouter",
    actor_role: payload.actor_role || roles.guest,
    target_user:
      payload.target_user && typeof payload.target_user === "object"
        ? payload.target_user
        : null,
    feature_enabled: Boolean(payload.feature_enabled),
    rollout_state: payload.rollout_state || aiRolloutStates.disabled,
    used_ai: Boolean(payload.used_ai),
    fallback_active: Boolean(payload.fallback_active),
    signals:
      payload.signals && typeof payload.signals === "object"
        ? payload.signals
        : {},
    peer_matches: Array.isArray(payload.peer_matches)
      ? payload.peer_matches.map(normalizePeerRecommendation)
      : [],
    skill_recommendations: Array.isArray(payload.skill_recommendations)
      ? payload.skill_recommendations.map(normalizeSkillRecommendation)
      : [],
    course_recommendations: Array.isArray(payload.course_recommendations)
      ? payload.course_recommendations.map(normalizeCourseRecommendation)
      : [],
    event_recommendations: Array.isArray(payload.event_recommendations)
      ? payload.event_recommendations.map(normalizeEventRecommendation)
      : [],
    opportunity_recommendations: Array.isArray(payload.opportunity_recommendations)
      ? payload.opportunity_recommendations.map(normalizeOpportunityRecommendation)
      : [],
  };
}

function normalizeLearningGuidanceEnrollment(item = {}) {
  return {
    id: Number(item.id || 0),
    status: item.status || "",
    progress_percent: Number(item.progress_percent || 0),
    completed_lessons: Number(item.completed_lessons || 0),
    total_lessons: Number(item.total_lessons || 0),
    next_lesson_id: item.next_lesson_id ? Number(item.next_lesson_id) : null,
  };
}

function normalizeLearningGuidanceLesson(item = {}) {
  return {
    id: Number(item.id || 0),
    title: item.title || "",
    item_type: item.item_type || "",
    module_title: item.module_title || "",
    description: item.description || "",
    duration_minutes: item.duration_minutes ? Number(item.duration_minutes) : null,
    is_completed: Boolean(item.is_completed),
  };
}

function normalizeSkillGap(item = {}) {
  return {
    skill: item.skill || "",
    priority: item.priority || "medium",
    rationale: item.rationale || "",
    suggested_actions: Array.isArray(item.suggested_actions) ? item.suggested_actions : [],
    source_signals:
      item.source_signals && typeof item.source_signals === "object"
        ? item.source_signals
        : {},
    used_ai: Boolean(item.used_ai),
  };
}

function normalizeLearningAction(item = {}) {
  return {
    key: item.key || "",
    title: item.title || "",
    detail: item.detail || "",
    route: item.route || "",
    action_type: item.action_type || "",
    source_signals:
      item.source_signals && typeof item.source_signals === "object"
        ? item.source_signals
        : {},
    used_ai: Boolean(item.used_ai),
  };
}

function normalizeAssignmentFeedback(item = {}) {
  return {
    lesson_id: Number(item.lesson_id || 0),
    lesson_title: item.lesson_title || "",
    item_type: item.item_type || "",
    readiness: item.readiness || "",
    feedback: item.feedback || "",
    checklist: Array.isArray(item.checklist) ? item.checklist : [],
    source_signals:
      item.source_signals && typeof item.source_signals === "object"
        ? item.source_signals
        : {},
    used_ai: Boolean(item.used_ai),
  };
}

export function normalizeAILearningGuidance(payload = {}) {
  return {
    provider: payload.provider || "openrouter",
    actor_role: payload.actor_role || roles.guest,
    target_user:
      payload.target_user && typeof payload.target_user === "object"
        ? payload.target_user
        : null,
    guidance_feature_enabled: Boolean(payload.guidance_feature_enabled),
    assignment_feedback_enabled: Boolean(payload.assignment_feedback_enabled),
    guidance_rollout_state: payload.guidance_rollout_state || aiRolloutStates.disabled,
    assignment_feedback_rollout_state:
      payload.assignment_feedback_rollout_state || aiRolloutStates.disabled,
    used_ai: Boolean(payload.used_ai),
    fallback_active: Boolean(payload.fallback_active),
    course_context:
      payload.course_context && typeof payload.course_context === "object"
        ? normalizeCourse(payload.course_context)
        : null,
    enrollment:
      payload.enrollment && typeof payload.enrollment === "object"
        ? normalizeLearningGuidanceEnrollment(payload.enrollment)
        : null,
    lesson_focus:
      payload.lesson_focus && typeof payload.lesson_focus === "object"
        ? normalizeLearningGuidanceLesson(payload.lesson_focus)
        : null,
    signals:
      payload.signals && typeof payload.signals === "object"
        ? payload.signals
        : {},
    guidance_summary: payload.guidance_summary || "",
    skill_gaps: Array.isArray(payload.skill_gaps)
      ? payload.skill_gaps.map(normalizeSkillGap)
      : [],
    next_actions: Array.isArray(payload.next_actions)
      ? payload.next_actions.map(normalizeLearningAction)
      : [],
    assignment_feedback: Array.isArray(payload.assignment_feedback)
      ? payload.assignment_feedback.map(normalizeAssignmentFeedback)
      : [],
  };
}

export async function fetchAIRecommendationFeed({
  userId,
  limitPerType = 4,
} = {}) {
  const searchParams = new URLSearchParams();
  if (userId) {
    searchParams.set("user_id", String(userId));
  }
  if (limitPerType) {
    searchParams.set("limit_per_type", String(limitPerType));
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const payload = await authenticatedApiRequest(`/ai/recommendations/${suffix}`, {
    method: "GET",
  });
  return normalizeAIRecommendationFeed(payload);
}

export async function fetchAILearningGuidance({
  userId,
  courseId,
  lessonId,
} = {}) {
  const searchParams = new URLSearchParams();
  if (userId) {
    searchParams.set("user_id", String(userId));
  }
  if (courseId) {
    searchParams.set("course_id", String(courseId));
  }
  if (lessonId) {
    searchParams.set("lesson_id", String(lessonId));
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const payload = await authenticatedApiRequest(`/ai/learning-guidance/${suffix}`, {
    method: "GET",
  });
  return normalizeAILearningGuidance(payload);
}

function normalizeCognitiveMonitoringSignal(item = {}) {
  return {
    key: item.key || "",
    label: item.label || item.key || "",
    description: item.description || "",
    category: item.category || "",
    sensitivity: item.sensitivity || "",
  };
}

function normalizeCognitiveMonitoringPolicy(policy = {}) {
  return {
    feature_key: policy.feature_key || "cognitive_monitoring",
    policy_version: policy.policy_version || "",
    rollout_state: policy.rollout_state || aiRolloutStates.disabled,
    consent_required: Boolean(policy.consent_required),
    default_active: Boolean(policy.default_active),
    camera_required: Boolean(policy.camera_required),
    camera_signals_enabled: Boolean(policy.camera_signals_enabled),
    biometric_inference_allowed: Boolean(policy.biometric_inference_allowed),
    retention_days: Number(policy.retention_days || 0),
    surfaces: Array.isArray(policy.surfaces) ? policy.surfaces : [],
    admin_surfaces: Array.isArray(policy.admin_surfaces) ? policy.admin_surfaces : [],
    allowed_signals: Array.isArray(policy.allowed_signals)
      ? policy.allowed_signals.map(normalizeCognitiveMonitoringSignal)
      : [],
    default_signal_keys: Array.isArray(policy.default_signal_keys)
      ? policy.default_signal_keys
      : [],
    blocked_signal_keys: Array.isArray(policy.blocked_signal_keys)
      ? policy.blocked_signal_keys
      : [],
    storage_policy: policy.storage_policy || "",
  };
}

function normalizeCognitiveMonitoringConsentRecord(record = {}) {
  return {
    id: Number(record.id || 0),
    status: record.status || "",
    policy_version: record.policy_version || "",
    allowed_signals: Array.isArray(record.allowed_signals) ? record.allowed_signals : [],
    surfaces: Array.isArray(record.surfaces) ? record.surfaces : [],
    source_surface: record.source_surface || "",
    disclosure_acknowledged: Boolean(record.disclosure_acknowledged),
    granted_at: record.granted_at || "",
    revoked_at: record.revoked_at || "",
    revoked_reason: record.revoked_reason || "",
    metadata: record.metadata && typeof record.metadata === "object" ? record.metadata : {},
  };
}

export function normalizeAICognitiveMonitoringConsent(payload = {}) {
  return {
    feature_key: payload.feature_key || "cognitive_monitoring",
    actor_role: payload.actor_role || roles.guest,
    policy: normalizeCognitiveMonitoringPolicy(payload.policy || {}),
    is_consented: Boolean(payload.is_consented),
    monitoring_active: Boolean(payload.monitoring_active),
    active_consent:
      payload.active_consent && typeof payload.active_consent === "object"
        ? normalizeCognitiveMonitoringConsentRecord(payload.active_consent)
        : null,
    history: Array.isArray(payload.history)
      ? payload.history.map(normalizeCognitiveMonitoringConsentRecord)
      : [],
  };
}

function normalizeCognitiveMonitoringSignalCount(item = {}) {
  return {
    key: item.key || "",
    label: item.label || item.key || "",
    count: Number(item.count || 0),
  };
}

function normalizeAdminCognitiveMonitoringRecord(record = {}) {
  return {
    ...normalizeCognitiveMonitoringConsentRecord(record),
    user: record.user && typeof record.user === "object" ? record.user : null,
  };
}

export function normalizeAdminAICognitiveMonitoringOverview(payload = {}) {
  return {
    policy: normalizeCognitiveMonitoringPolicy(payload.policy || {}),
    summary:
      payload.summary && typeof payload.summary === "object"
        ? {
            active_consents: Number(payload.summary.active_consents || 0),
            revoked_consents: Number(payload.summary.revoked_consents || 0),
            distinct_consented_users: Number(
              payload.summary.distinct_consented_users || 0,
            ),
            currently_monitored_users: Number(
              payload.summary.currently_monitored_users || 0,
            ),
          }
        : {
            active_consents: 0,
            revoked_consents: 0,
            distinct_consented_users: 0,
            currently_monitored_users: 0,
          },
    signal_counts: Array.isArray(payload.signal_counts)
      ? payload.signal_counts.map(normalizeCognitiveMonitoringSignalCount)
      : [],
    recent_records: Array.isArray(payload.recent_records)
      ? payload.recent_records.map(normalizeAdminCognitiveMonitoringRecord)
      : [],
  };
}

export async function fetchAICognitiveMonitoringConsent() {
  const payload = await authenticatedApiRequest("/ai/cognitive-monitoring/consent/", {
    method: "GET",
  });
  return normalizeAICognitiveMonitoringConsent(payload);
}

export async function updateAICognitiveMonitoringConsent({
  allowedSignals,
  sourceSurface = "",
}) {
  const payload = await authenticatedApiRequest("/ai/cognitive-monitoring/consent/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      allowed_signals: allowedSignals,
      acknowledged_disclosure: true,
      source_surface: sourceSurface,
    }),
  });
  return normalizeAICognitiveMonitoringConsent(payload);
}

export async function revokeAICognitiveMonitoringConsent(reason = "") {
  const payload = await authenticatedApiRequest(
    "/ai/cognitive-monitoring/consent/revoke/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );
  return normalizeAICognitiveMonitoringConsent(payload);
}

export async function fetchAdminAICognitiveMonitoringOverview() {
  const payload = await authenticatedApiRequest(
    "/admin/ai/cognitive-monitoring/overview/",
    {
      method: "GET",
    },
  );
  return normalizeAdminAICognitiveMonitoringOverview(payload);
}

function normalizeAdaptiveSignal(item = {}) {
  return {
    key: item.key || "",
    label: item.label || item.key || "",
    value: item.value && typeof item.value === "object" ? item.value : {},
    explanation: item.explanation || "",
    confidence: item.confidence || "medium",
  };
}

function normalizeFocusDrift(item = {}) {
  return {
    level: item.level || "inactive",
    score: Number(item.score || 0),
    rationale: item.rationale || "",
    source_signal_keys: Array.isArray(item.source_signal_keys)
      ? item.source_signal_keys
      : [],
  };
}

function normalizeMoodMirror(item = {}) {
  return {
    state: item.state || "inactive",
    label: item.label || "Inactive",
    confidence: item.confidence || "low",
    rationale: item.rationale || "",
    self_report:
      item.self_report && typeof item.self_report === "object"
        ? {
            id: Number(item.self_report.id || 0),
            mood_label: item.self_report.mood_label || "",
            focus_level: item.self_report.focus_level ?? null,
            energy_level: item.self_report.energy_level ?? null,
            stress_level: item.self_report.stress_level ?? null,
            reflection_note: item.self_report.reflection_note || "",
            surface: item.self_report.surface || "",
            course_id: item.self_report.course_id ?? null,
            created_at: item.self_report.created_at || "",
          }
        : null,
    source_signal_keys: Array.isArray(item.source_signal_keys)
      ? item.source_signal_keys
      : [],
  };
}

function normalizeAdaptiveResponse(item = {}) {
  return {
    key: item.key || "",
    priority: item.priority || "low",
    title: item.title || "",
    detail: item.detail || "",
    action_type: item.action_type || "",
    route: item.route || "",
    source_signal_keys: Array.isArray(item.source_signal_keys)
      ? item.source_signal_keys
      : [],
  };
}

export function normalizeAIAdaptiveMonitoringState(payload = {}) {
  return {
    actor_role: payload.actor_role || roles.guest,
    target_user:
      payload.target_user && typeof payload.target_user === "object"
        ? payload.target_user
        : null,
    policy: normalizeCognitiveMonitoringPolicy(payload.policy || {}),
    monitoring_active: Boolean(payload.monitoring_active),
    fallback_active: Boolean(payload.fallback_active),
    used_ai: Boolean(payload.used_ai),
    surface: payload.surface || "",
    active_signal_keys: Array.isArray(payload.active_signal_keys)
      ? payload.active_signal_keys
      : [],
    signals: Array.isArray(payload.signals)
      ? payload.signals.map(normalizeAdaptiveSignal)
      : [],
    focus_drift: normalizeFocusDrift(payload.focus_drift || {}),
    mood_mirror: normalizeMoodMirror(payload.mood_mirror || {}),
    adaptive_responses: Array.isArray(payload.adaptive_responses)
      ? payload.adaptive_responses.map(normalizeAdaptiveResponse)
      : [],
    generated_at: payload.generated_at || "",
  };
}

export async function fetchAIAdaptiveMonitoringState({
  userId,
  courseId,
  surface = "",
} = {}) {
  const searchParams = new URLSearchParams();
  if (userId) {
    searchParams.set("user_id", String(userId));
  }
  if (courseId) {
    searchParams.set("course_id", String(courseId));
  }
  if (surface) {
    searchParams.set("surface", surface);
  }
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const payload = await authenticatedApiRequest(
    `/ai/cognitive-monitoring/adaptive-state/${suffix}`,
    { method: "GET" },
  );
  return normalizeAIAdaptiveMonitoringState(payload);
}

export async function submitAIAdaptiveMonitoringCheckIn({
  courseId,
  surface = "",
  moodLabel = "steady",
  focusLevel,
  energyLevel,
  stressLevel,
  reflectionNote = "",
} = {}) {
  const payload = await authenticatedApiRequest(
    "/ai/cognitive-monitoring/check-in/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(courseId ? { course_id: Number(courseId) } : {}),
        surface,
        mood_label: moodLabel,
        focus_level: focusLevel ? Number(focusLevel) : null,
        energy_level: energyLevel ? Number(energyLevel) : null,
        stress_level: stressLevel ? Number(stressLevel) : null,
        reflection_note: reflectionNote,
      }),
    },
  );
  return normalizeAIAdaptiveMonitoringState(payload);
}
