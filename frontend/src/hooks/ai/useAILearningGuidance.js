import { useCallback, useEffect, useMemo, useState } from "react";
import { getAIFeature } from "@/lib/ai-capabilities";
import { aiFeatureKeys } from "@/lib/domain-enums";
import {
  fetchAICapabilitySnapshot,
  fetchAILearningGuidance,
} from "@/services/ai/ai.service";

const emptyGuidance = Object.freeze({
  provider: "openrouter",
  actor_role: "",
  target_user: null,
  guidance_feature_enabled: false,
  assignment_feedback_enabled: false,
  guidance_rollout_state: "disabled",
  assignment_feedback_rollout_state: "disabled",
  used_ai: false,
  fallback_active: true,
  course_context: null,
  enrollment: null,
  lesson_focus: null,
  signals: {},
  guidance_summary: "",
  skill_gaps: [],
  next_actions: [],
  assignment_feedback: [],
});

export function useAILearningGuidance({
  enabled = true,
  userId,
  courseId,
  lessonId,
} = {}) {
  const [state, setState] = useState({
    capability: null,
    guidanceFeature: null,
    assignmentFeature: null,
    guidance: emptyGuidance,
    loading: Boolean(enabled),
    error: "",
  });

  const load = useCallback(async () => {
    if (!enabled) {
      const nextState = {
        capability: null,
        guidanceFeature: null,
        assignmentFeature: null,
        guidance: emptyGuidance,
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

    const [capabilityResult, guidanceResult] = await Promise.allSettled([
      fetchAICapabilitySnapshot(),
      fetchAILearningGuidance({
        userId,
        courseId,
        lessonId,
      }),
    ]);

    const capability =
      capabilityResult.status === "fulfilled" ? capabilityResult.value : null;
    const guidanceFeature = capability
      ? getAIFeature(capability, aiFeatureKeys.learningGuidance)
      : null;
    const assignmentFeature = capability
      ? getAIFeature(capability, aiFeatureKeys.assignmentFeedback)
      : null;
    const guidance =
      guidanceResult.status === "fulfilled" ? guidanceResult.value : emptyGuidance;
    const error =
      guidanceResult.status === "rejected"
        ? guidanceResult.reason?.message || "Failed to load learning guidance."
        : capabilityResult.status === "rejected"
          ? capabilityResult.reason?.message || "Failed to load AI capability status."
          : "";

    const nextState = {
      capability,
      guidanceFeature,
      assignmentFeature,
      guidance,
      loading: false,
      error,
    };
    setState(nextState);
    return nextState;
  }, [courseId, enabled, lessonId, userId]);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setState({
        capability: null,
        guidanceFeature: null,
        assignmentFeature: null,
        guidance: emptyGuidance,
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
          guidanceFeature: null,
          assignmentFeature: null,
          guidance: emptyGuidance,
          loading: false,
          error: error.message || "Failed to load learning guidance.",
        });
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [enabled, load]);

  const hasGuidance = useMemo(
    () =>
      Boolean(state.guidance.guidance_summary) ||
      state.guidance.skill_gaps.length > 0 ||
      state.guidance.next_actions.length > 0 ||
      state.guidance.assignment_feedback.length > 0 ||
      Boolean(state.guidance.course_context),
    [state.guidance],
  );

  return {
    ...state,
    hasGuidance,
    refresh: load,
  };
}
