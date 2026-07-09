import { useCallback, useEffect, useState } from "react";
import { fetchAdminDashboardData } from "@/services/dashboard/dashboard.service";

export function useAdminDashboardData() {
  const [state, setState] = useState({
    summary: {},
    oversight: {},
    adaptiveMonitoring: {},
    organizationVerificationRequests: [],
    financialAccounts: [],
    events: [],
    users: [],
    moderatedOrganizations: [],
    courses: [],
    jobs: [],
    taxonomySuggestions: [],
    taxonomyCatalog: [],
    auditLogs: [],
    analytics: {
      summary: {},
      matching_quality: {
        score_distribution: [],
      },
      adaptive_monitoring: {
        summary: {},
        signal_counts: [],
        mood_distribution: [],
        surface_distribution: [],
      },
      system_health: {
        provider: {},
        feature_rollouts: [],
      },
      session_coordination_analytics: {},
      global_knowledge_trends: {
        top_fields: [],
        top_offered_skills: [],
        top_learning_skills: [],
        top_course_categories: [],
        top_event_categories: [],
        top_opportunity_categories: [],
      },
      social_impact_heatmap: [],
      insight_cards: [],
    },
    loading: true,
    error: "",
  });

  const load = useCallback(async () => {
    const data = await fetchAdminDashboardData();
    setState({
      ...data,
      loading: false,
      error: "",
    });
    return data;
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const data = await fetchAdminDashboardData();
        if (!active) {
          return;
        }
        setState({
          ...data,
          loading: false,
          error: "",
        });
      } catch (error) {
        console.error(error);
        if (active) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error.message || "Failed to load the admin dashboard.",
          }));
        }
      }
    };

    run();
    return () => {
      active = false;
    };
  }, []);

  return {
    ...state,
    refresh: load,
  };
}
