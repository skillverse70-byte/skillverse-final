import { useEffect, useMemo, useState } from "react";
import {
  createSession,
  fetchSessions,
  updateSession,
} from "@/services/messages/sessions.service";

function sortSessions(sessions) {
  return [...sessions].sort(
    (left, right) =>
      new Date(left.scheduled_start_at).getTime() - new Date(right.scheduled_start_at).getTime(),
  );
}

export function useSwapSessions(swapRequestId = null) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!swapRequestId) {
      setSessions([]);
      setError("");
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const nextSessions = await fetchSessions({ swapRequestId });
        if (!active) {
          return;
        }
        setSessions(sortSessions(nextSessions));
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load planned sessions.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [swapRequestId]);

  const groupedSessions = useMemo(() => {
    const upcoming = [];
    const completed = [];
    const cancelled = [];

    sessions.forEach((session) => {
      if (session.status === "completed") {
        completed.push(session);
        return;
      }
      if (session.status === "cancelled") {
        cancelled.push(session);
        return;
      }
      upcoming.push(session);
    });

    return {
      upcoming,
      completed: completed.sort(
        (left, right) => new Date(right.completed_at || right.updated_at).getTime() - new Date(left.completed_at || left.updated_at).getTime(),
      ),
      cancelled: cancelled.sort(
        (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
      ),
    };
  }, [sessions]);

  const createPlannedSession = async (payload) => {
    setSaving(true);
    setError("");
    try {
      const session = await createSession({
        ...payload,
        swap_request_id: swapRequestId,
      });
      setSessions((current) => sortSessions([...current, session]));
      return session;
    } catch (requestError) {
      setError(requestError.message || "Failed to save the session plan.");
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const patchSession = async (sessionId, payload) => {
    setSaving(true);
    setError("");
    try {
      const updatedSession = await updateSession(sessionId, payload);
      setSessions((current) =>
        sortSessions(
          current.map((session) =>
            session.id === sessionId ? updatedSession : session,
          ),
        ),
      );
      return updatedSession;
    } catch (requestError) {
      setError(requestError.message || "Failed to update the session.");
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  return {
    sessions,
    groupedSessions,
    loading,
    saving,
    error,
    createPlannedSession,
    patchSession,
  };
}
