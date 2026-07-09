import { useCallback, useEffect, useState } from "react";
import { fetchOrganizationDashboardData } from "@/services/dashboard/dashboard.service";

export function useOrganizationDashboardData() {
  const [state, setState] = useState({
    organization: null,
    verification: null,
    financialAccount: null,
    stats: {},
    coursePerformance: [],
    courses: [],
    enrollments: [],
    events: [],
    opportunities: [],
    applications: [],
    analytics: {
      summary: {},
      course_category_distribution: [],
      learner_progress_bands: [],
      event_engagement: {
        rsvp_status_distribution: [],
        format_distribution: [],
        attendance_rate_percent: 0,
      },
      opportunity_pipeline: {
        application_status_distribution: [],
        shortlisted_rate_percent: 0,
        hired_rate_percent: 0,
      },
      knowledge_trends: {
        top_fields: [],
        top_offered_skills: [],
        top_learning_skills: [],
        top_course_categories: [],
        top_event_categories: [],
        top_opportunity_categories: [],
      },
      social_impact_heatmap: [],
      matching_quality: {},
      system_health: {
        provider: {},
        feature_rollouts: [],
      },
      insight_cards: [],
    },
    loading: true,
    error: "",
  });

  const load = useCallback(async () => {
    const data = await fetchOrganizationDashboardData();
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
        const data = await fetchOrganizationDashboardData();
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
            error: error.message || "Failed to load your organization dashboard.",
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
