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

