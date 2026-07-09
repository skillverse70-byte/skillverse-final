import { aiFeatureKeys, aiRolloutStates, roles } from "@/lib/domain-enums";

export const aiFeatureCatalog = Object.freeze({
  [aiFeatureKeys.recommendations]: {
    label: "AI Recommendations",
  },
  [aiFeatureKeys.learningGuidance]: {
    label: "AI Learning Guidance",
  },
  [aiFeatureKeys.assignmentFeedback]: {
    label: "AI Assignment Feedback",
  },
  [aiFeatureKeys.cognitiveMonitoring]: {
    label: "Adaptive Monitoring",
  },
});

export function normalizeAIFeatureCapability(feature = {}) {
  return {
    key: feature.key || "",
    label:
      feature.label ||
      aiFeatureCatalog[feature.key]?.label ||
      String(feature.key || ""),
    rollout_state: feature.rollout_state || aiRolloutStates.disabled,
    enabled: Boolean(feature.enabled),
    available: Boolean(feature.available),
    actor_enabled: Boolean(feature.actor_enabled),
    actor_roles: Array.isArray(feature.actor_roles) ? feature.actor_roles : [],
    surfaces: Array.isArray(feature.surfaces) ? feature.surfaces : [],
    fallback_behavior: feature.fallback_behavior || "",
    explainability_required: Boolean(feature.explainability_required),
  };
}

export function normalizeAICapabilitySnapshot(payload = {}) {
  return {
    provider: payload.provider || "openrouter",
    actor_role: payload.actor_role || roles.guest,
    global_enabled: Boolean(payload.global_enabled),
    provider_configured: Boolean(payload.provider_configured),
    fallback_contract:
      payload.fallback_contract && typeof payload.fallback_contract === "object"
        ? payload.fallback_contract
        : {},
    integration_rules:
      payload.integration_rules && typeof payload.integration_rules === "object"
        ? payload.integration_rules
        : {},
    features: Array.isArray(payload.features)
      ? payload.features.map(normalizeAIFeatureCapability)
      : [],
  };
}

export function getAIFeature(snapshot, featureKey) {
  return snapshot.features.find((feature) => feature.key === featureKey) || null;
}

export function isAIFeatureReady(snapshot, featureKey) {
  const feature = getAIFeature(snapshot, featureKey);
  return feature?.rollout_state === aiRolloutStates.ready && feature.available;
}

export function isAIFeatureFallbackOnly(snapshot, featureKey) {
  const feature = getAIFeature(snapshot, featureKey);
  return feature?.rollout_state === aiRolloutStates.fallbackOnly;
}
