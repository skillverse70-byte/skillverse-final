import { useCallback, useEffect, useState } from "react";
import { getAIFeature } from "@/lib/ai-capabilities";
import { aiFeatureKeys, aiRolloutStates, roles } from "@/lib/domain-enums";
import {
  fetchAICapabilitySnapshot,
  fetchAICognitiveMonitoringConsent,
  revokeAICognitiveMonitoringConsent,
  updateAICognitiveMonitoringConsent,
} from "@/services/ai/ai.service";

const emptyConsent = Object.freeze({
  feature_key: aiFeatureKeys.cognitiveMonitoring,
  actor_role: roles.guest,
  policy: {
    feature_key: aiFeatureKeys.cognitiveMonitoring,
    policy_version: "",
    rollout_state: aiRolloutStates.disabled,
    consent_required: true,
    default_active: false,
    camera_required: false,
    camera_signals_enabled: false,
    biometric_inference_allowed: false,
    retention_days: 0,
    surfaces: [],
    admin_surfaces: [],
    allowed_signals: [],
    default_signal_keys: [],
    blocked_signal_keys: [],
    storage_policy: "",
  },
  is_consented: false,
  monitoring_active: false,
  active_consent: null,
  history: [],
});

export function useAICognitiveMonitoringConsent({ enabled = true } = {}) {
  const [state, setState] = useState({
    capability: null,
    feature: null,
    consent: emptyConsent,
    loading: Boolean(enabled),
    saving: false,
    error: "",
  });

  const load = useCallback(async () => {
    if (!enabled) {
      const nextState = {
        capability: null,
        feature: null,
        consent: emptyConsent,
        loading: false,
        saving: false,
        error: "",
      };
      setState(nextState);
      return nextState;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    const [capabilityResult, consentResult] = await Promise.allSettled([
      fetchAICapabilitySnapshot(),
      fetchAICognitiveMonitoringConsent(),
    ]);

    const capability =
      capabilityResult.status === "fulfilled" ? capabilityResult.value : null;
    const feature = capability
      ? getAIFeature(capability, aiFeatureKeys.cognitiveMonitoring)
      : null;
    const consent =
      consentResult.status === "fulfilled" ? consentResult.value : emptyConsent;
    const error =
      consentResult.status === "rejected"
        ? consentResult.reason?.message ||
          "Failed to load adaptive monitoring controls."
        : capabilityResult.status === "rejected"
          ? capabilityResult.reason?.message || "Failed to load AI capability status."
          : "";

    const nextState = {
      capability,
      feature,
      consent,
      loading: false,
      saving: false,
      error,
    };
    setState(nextState);
    return nextState;
  }, [enabled]);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setState({
        capability: null,
        feature: null,
        consent: emptyConsent,
        loading: false,
        saving: false,
        error: "",
      });
      return () => {
        active = false;
      };
    }

    const run = async () => {
      try {
        const result = await load();
        if (!active) {
          return;
        }
        setState(result);
      } catch (error) {
        if (!active) {
          return;
        }
        setState({
          capability: null,
          feature: null,
          consent: emptyConsent,
          loading: false,
          saving: false,
          error: error.message || "Failed to load adaptive monitoring controls.",
        });
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [enabled, load]);

  const saveConsent = useCallback(
    async ({ allowedSignals, sourceSurface = "" }) => {
      setState((current) => ({
        ...current,
        saving: true,
        error: "",
      }));
      try {
        const consent = await updateAICognitiveMonitoringConsent({
          allowedSignals,
          sourceSurface,
        });
        setState((current) => ({
          ...current,
          consent,
          saving: false,
          error: "",
        }));
        return consent;
      } catch (error) {
        setState((current) => ({
          ...current,
          saving: false,
          error:
            error.message || "Unable to save adaptive monitoring consent right now.",
        }));
        throw error;
      }
    },
    [],
  );

  const revokeConsent = useCallback(async (reason = "") => {
    setState((current) => ({
      ...current,
      saving: true,
      error: "",
    }));
    try {
      const consent = await revokeAICognitiveMonitoringConsent(reason);
      setState((current) => ({
        ...current,
        consent,
        saving: false,
        error: "",
      }));
      return consent;
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error:
          error.message ||
          "Unable to revoke adaptive monitoring consent right now.",
      }));
      throw error;
    }
  }, []);

  return {
    ...state,
    refresh: load,
    saveConsent,
    revokeConsent,
  };
}
