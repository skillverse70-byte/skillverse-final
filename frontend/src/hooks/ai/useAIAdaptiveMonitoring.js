import { useCallback, useEffect, useState } from "react";
import {
  fetchAIAdaptiveMonitoringState,
  submitAIAdaptiveMonitoringCheckIn,
} from "@/services/ai/ai.service";

const emptyAdaptiveState = Object.freeze({
  actor_role: "",
  target_user: null,
  policy: {},
  monitoring_active: false,
  fallback_active: true,
  used_ai: false,
  surface: "",
  active_signal_keys: [],
  signals: [],
  focus_drift: {
    level: "inactive",
    score: 0,
    rationale: "",
    source_signal_keys: [],
  },
  mood_mirror: {
    state: "inactive",
    label: "Inactive",
    confidence: "low",
    rationale: "",
    self_report: null,
    source_signal_keys: [],
  },
  adaptive_responses: [],
  generated_at: "",
});

export function useAIAdaptiveMonitoring({
  enabled = true,
  userId,
  courseId,
  surface = "",
} = {}) {
  const [state, setState] = useState({
    adaptiveState: emptyAdaptiveState,
    loading: Boolean(enabled),
    submitting: false,
    error: "",
  });

  const load = useCallback(async () => {
    if (!enabled) {
      const nextState = {
        adaptiveState: emptyAdaptiveState,
        loading: false,
        submitting: false,
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

    try {
      const adaptiveState = await fetchAIAdaptiveMonitoringState({
        userId,
        courseId,
        surface,
      });
      const nextState = {
        adaptiveState,
        loading: false,
        submitting: false,
        error: "",
      };
      setState(nextState);
      return nextState;
    } catch (error) {
      const nextState = {
        adaptiveState: emptyAdaptiveState,
        loading: false,
        submitting: false,
        error: error.message || "Failed to load adaptive monitoring.",
      };
      setState(nextState);
      return nextState;
    }
  }, [courseId, enabled, surface, userId]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const result = await load();
      if (!active) {
        return;
      }
      setState(result);
    };

    run();
    return () => {
      active = false;
    };
  }, [load]);

  const submitCheckIn = useCallback(
    async (payload) => {
      setState((current) => ({
        ...current,
        submitting: true,
        error: "",
      }));
      try {
        const adaptiveState = await submitAIAdaptiveMonitoringCheckIn({
          ...payload,
          courseId: payload?.courseId ?? courseId,
          surface: payload?.surface ?? surface,
        });
        setState((current) => ({
          ...current,
          adaptiveState,
          submitting: false,
          error: "",
        }));
        return adaptiveState;
      } catch (error) {
        setState((current) => ({
          ...current,
          submitting: false,
          error: error.message || "Unable to submit check-in.",
        }));
        throw error;
      }
    },
    [courseId, surface],
  );

  return {
    ...state,
    refresh: load,
    submitCheckIn,
  };
}
