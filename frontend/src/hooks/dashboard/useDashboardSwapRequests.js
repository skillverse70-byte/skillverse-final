import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptSwapRequest,
  cancelSwapRequest,
  fetchSwapRequests,
  rejectSwapRequest,
} from "@/services/skills/skills.service";

export function useDashboardSwapRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const data = await fetchSwapRequests();
    setRequests(data);
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const data = await fetchSwapRequests();
        if (!active) {
          return;
        }
        setRequests(data);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load swap notifications.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, []);

  const requestGroups = useMemo(() => {
    const incoming = [];
    const outgoing = [];
    const active = [];
    const closed = [];

    requests.forEach((request) => {
      if (request.status === "accepted") {
        active.push(request);
        return;
      }

      if (request.status === "pending") {
        if (request.my_role === "recipient") {
          incoming.push(request);
        } else {
          outgoing.push(request);
        }
        return;
      }

      closed.push(request);
    });

    return { incoming, outgoing, active, closed };
  }, [requests]);

  const runAction = useCallback(async (id, action) => {
    setError("");
    setActingId(id);
    try {
      const updated = await action();
      setRequests((current) =>
        current.map((request) => (request.id === id ? updated : request)),
      );
      return updated;
    } catch (requestError) {
      setError(requestError.message || "Swap action failed.");
      throw requestError;
    } finally {
      setActingId(null);
    }
  }, []);

  return {
    requests,
    requestGroups,
    loading,
    actingId,
    error,
    refresh: load,
    acceptRequest: (id, note) => runAction(id, () => acceptSwapRequest(id, note)),
    rejectRequest: (id, note) => runAction(id, () => rejectSwapRequest(id, note)),
    cancelRequest: (id, note) => runAction(id, () => cancelSwapRequest(id, note)),
  };
}
