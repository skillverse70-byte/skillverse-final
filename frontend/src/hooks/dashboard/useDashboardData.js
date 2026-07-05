import { useEffect, useState } from "react";
import { fetchDashboardData } from "@/services/dashboard/dashboard.service";

export function useDashboardData() {
  const [state, setState] = useState({
    user: null,
    enrollments: [],
    swaps: [],
    applications: [],
    rsvps: [],
    loading: true,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchDashboardData();
        if (!active) {
          return;
        }
        setState({
          ...data,
          loading: false,
        });
      } catch (error) {
        console.error(error);
        if (active) {
          setState((current) => ({ ...current, loading: false }));
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  return state;
}
