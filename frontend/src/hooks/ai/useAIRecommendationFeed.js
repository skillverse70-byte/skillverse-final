import { useCallback, useEffect, useMemo, useState } from "react";
import { getAIFeature } from "@/lib/ai-capabilities";
import { aiFeatureKeys } from "@/lib/domain-enums";
import {
  fetchAICapabilitySnapshot,
  fetchAIRecommendationFeed,
} from "@/services/ai/ai.service";

const emptyFeed = Object.freeze({
  provider: "openrouter",
  actor_role: "",
  target_user: null,
  feature_enabled: false,
  rollout_state: "disabled",
  used_ai: false,
  fallback_active: true,
  signals: {},
  peer_matches: [],
  skill_recommendations: [],
  course_recommendations: [],
  event_recommendations: [],
  opportunity_recommendations: [],
});

export function useAIRecommendationFeed({
  enabled = true,
  userId,
  limitPerType = 4,
} = {}) {
  const [state, setState] = useState({
    capability: null,
    feature: null,
    feed: emptyFeed,
    loading: Boolean(enabled),
    error: "",
  });

  const load = useCallback(async () => {
    if (!enabled) {
      const nextState = {
        capability: null,
        feature: null,
        feed: emptyFeed,
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

    const [capabilityResult, feedResult] = await Promise.allSettled([
      fetchAICapabilitySnapshot(),
      fetchAIRecommendationFeed({
        userId,
        limitPerType,
      }),
    ]);

    const capability =
      capabilityResult.status === "fulfilled" ? capabilityResult.value : null;
    const feature = capability
      ? getAIFeature(capability, aiFeatureKeys.recommendations)
      : null;
    const feed = feedResult.status === "fulfilled" ? feedResult.value : emptyFeed;
    const error =
      feedResult.status === "rejected"
        ? feedResult.reason?.message || "Failed to load personalized recommendations."
        : capabilityResult.status === "rejected"
          ? capabilityResult.reason?.message || "Failed to load AI capability status."
          : "";

    const nextState = {
      capability,
      feature,
      feed,
      loading: false,
      error,
    };
    setState(nextState);
    return nextState;
  }, [enabled, limitPerType, userId]);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setState({
        capability: null,
        feature: null,
        feed: emptyFeed,
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
          feed: emptyFeed,
          loading: false,
          error: error.message || "Failed to load personalized recommendations.",
        });
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [enabled, load]);

  const hasRecommendations = useMemo(
    () =>
      state.feed.peer_matches.length > 0 ||
      state.feed.skill_recommendations.length > 0 ||
      state.feed.course_recommendations.length > 0 ||
      state.feed.event_recommendations.length > 0 ||
      state.feed.opportunity_recommendations.length > 0,
    [state.feed],
  );

  return {
    ...state,
    hasRecommendations,
    refresh: load,
  };
}
