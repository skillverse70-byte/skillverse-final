import { useCallback, useEffect, useState } from "react";
import { getAIFeature } from "@/lib/ai-capabilities";
import { aiFeatureKeys, aiRolloutStates } from "@/lib/domain-enums";
import {
  fetchAdminAICognitiveMonitoringOverview,
  fetchAICapabilitySnapshot,
} from "@/services/ai/ai.service";

const emptyOverview = Object.freeze({
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
  summary: {
    active_consents: 0,
    revoked_consents: 0,
    distinct_consented_users: 0,
    currently_monitored_users: 0,
  },
  signal_counts: [],
  recent_records: [],
});

export function useAdminAICognitiveMonitoringOverview({ enabled = true } = {}) {
  const [state, setState] = useState({
    capability: null,
    feature: null,
    overview: emptyOverview,
    loading: Boolean(enabled),
    error: "",
  });

  const load = useCallback(async () => {
    if (!enabled) {
      const nextState = {
        capability: null,
        feature: null,
        overview: emptyOverview,
        loading: false,
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

    const [capabilityResult, overviewResult] = await Promise.allSettled([
      fetchAICapabilitySnapshot(),
      fetchAdminAICognitiveMonitoringOverview(),
    ]);

    const capability =
      capabilityResult.status === "fulfilled" ? capabilityResult.value : null;
    const feature = capability
      ? getAIFeature(capability, aiFeatureKeys.cognitiveMonitoring)
      : null;
    const overview =
      overviewResult.status === "fulfilled" ? overviewResult.value : emptyOverview;
    const error =
      overviewResult.status === "rejected"
        ? overviewResult.reason?.message ||
          "Failed to load adaptive monitoring governance data."
        : capabilityResult.status === "rejected"
          ? capabilityResult.reason?.message || "Failed to load AI capability status."
          : "";

    const nextState = {
      capability,
      feature,
      overview,
      loading: false,
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
        overview: emptyOverview,
        loading: false,
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
          overview: emptyOverview,
          loading: false,
          error:
            error.message ||
            "Failed to load adaptive monitoring governance data.",
        });
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [enabled, load]);

  return {
    ...state,
    refresh: load,
  };
}
