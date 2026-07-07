import { useCallback, useEffect, useState } from "react";
import { fetchAdminDashboardData } from "@/services/dashboard/dashboard.service";

export function useAdminDashboardData() {
  const [state, setState] = useState({
    summary: {},
    oversight: {},
    organizationVerificationRequests: [],
    financialAccounts: [],
    events: [],
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
