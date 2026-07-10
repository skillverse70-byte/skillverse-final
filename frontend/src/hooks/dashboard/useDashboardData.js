import { useCallback, useEffect, useState } from "react";
import { fetchRegularDashboardData } from "@/services/dashboard/dashboard.service";

export function useDashboardData() {
  const [state, setState] = useState({
    user: null,
    stats: {},
    recommendationSignals: {},
    enrollments: [],
    instructorInvitations: [],
    swapRequests: [],
    applications: [],
    rsvps: [],
    sessions: [],
    loading: true,
    error: "",
  });

  const load = useCallback(async () => {
    const data = await fetchRegularDashboardData();
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
        const data = await fetchRegularDashboardData();
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
            error: error.message || "Failed to load your dashboard.",
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
