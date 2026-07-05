import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptSwapRequest,
  cancelSwapRequest,
  createSwapRequest,
  fetchMatchSuggestions,
  fetchSwapRequests,
  rejectSwapRequest,
} from "@/services/skills/skills.service";

export function useSkillSwapHub(initialSearch = "") {
  const [matches, setMatches] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [matchesData, requestsData] = await Promise.all([
      fetchMatchSuggestions(),
      fetchSwapRequests(),
    ]);
    setMatches(matchesData);
    setRequests(requestsData);
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const [matchesData, requestsData] = await Promise.all([
          fetchMatchSuggestions(),
          fetchSwapRequests(),
        ]);
        if (!active) {
          return;
        }
        setMatches(matchesData);
        setRequests(requestsData);
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load your swap hub.");
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

  const requestMap = useMemo(() => {
    const priority = {
      pending: 3,
      accepted: 2,
    };
    const map = new Map();

    requests.forEach((request) => {
      const counterpartyId = request.counterparty?.id;
      if (!counterpartyId) {
        return;
      }

      const current = map.get(counterpartyId);
      const nextPriority = priority[request.status] || 0;
      const currentPriority = current ? priority[current.status] || 0 : -1;

      if (nextPriority > currentPriority && nextPriority > 0) {
        map.set(counterpartyId, request);
      }
    });

    return map;
  }, [requests]);

  const filteredMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return matches;
    }

    return matches.filter((match) => {
      const values = [
        match.target_user?.full_name,
        match.rationale,
        ...(match.can_learn_from_match || []).map((skill) => skill.name),
        ...(match.can_teach_match || []).map((skill) => skill.name),
        ...(match.shared_fields || []).map((field) => field.name),
        ...(match.shared_skill_interests || []).map((skill) => skill.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return values.includes(normalizedSearch);
    });
  }, [matches, search]);

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

  const sendRequest = useCallback(
    async (match, message) => {
      const targetId = match.target_user?.id;
      if (!targetId) {
        return null;
      }
      setError("");
      setActingId(`match-${match.id}`);
      try {
        const created = await createSwapRequest({
          recipient_user_id: targetId,
          match_suggestion_id: match.id,
          message,
          requester_note: "Created from the skill match flow.",
        });
        setRequests((current) => [created, ...current]);
        return created;
      } catch (requestError) {
        setError(requestError.message || "Failed to send swap request.");
        throw requestError;
      } finally {
        setActingId(null);
      }
    },
    [],
  );

  return {
    filteredMatches,
    requestMap,
    requestGroups,
    hasMatches: matches.length > 0,
    hasRequests: requests.length > 0,
    search,
    setSearch,
    loading,
    actingId,
    error,
    refresh: load,
    sendRequest,
    acceptRequest: (id, note) => runAction(id, () => acceptSwapRequest(id, note)),
    rejectRequest: (id, note) => runAction(id, () => rejectSwapRequest(id, note)),
    cancelRequest: (id, note) => runAction(id, () => cancelSwapRequest(id, note)),
  };
}
