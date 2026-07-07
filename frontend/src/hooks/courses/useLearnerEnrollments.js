import { useEffect, useState } from "react";
import { fetchLearnerEnrollments } from "@/services/courses/courses.service";

function buildLearningSummary(enrollments) {
  const active = enrollments.filter((enrollment) => enrollment.status === "active");
  const completed = enrollments.filter((enrollment) => enrollment.status === "completed");
  const nextUp =
    [...active].sort(
      (left, right) =>
        new Date(right.enrolled_date || right.enrolled_at || 0).getTime() -
        new Date(left.enrolled_date || left.enrolled_at || 0).getTime(),
    )[0] || null;

  return {
    total: enrollments.length,
    activeCount: active.length,
    completedCount: completed.length,
    averageProgress:
      active.length > 0
        ? Math.round(
            active.reduce(
              (sum, enrollment) => sum + (enrollment.progress_percent || 0),
              0,
            ) / active.length,
          )
        : 0,
    nextUp,
  };
}

export function useLearnerEnrollments() {
  const [state, setState] = useState({
    enrollments: [],
    summary: buildLearningSummary([]),
    loading: true,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const enrollments = await fetchLearnerEnrollments();
        if (!active) {
          return;
        }

        setState({
          enrollments,
          summary: buildLearningSummary(enrollments),
          loading: false,
        });
      } catch (error) {
        console.error(error);
        if (active) {
          setState({
            enrollments: [],
            summary: buildLearningSummary([]),
            loading: false,
          });
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
