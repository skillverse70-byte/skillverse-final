import { useEffect, useState } from "react";
import {
  decideAdminOrganizationVerificationRequest,
  fetchAdminOrganizationVerificationRequests,
} from "@/services/organizations/organization.service";

export function useAdminOrganizationVerification() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const data = await fetchAdminOrganizationVerificationRequests({ status: "pending" });
      setRequests(data);
      return data;
    } catch (requestError) {
      setError(requestError.message || "Failed to load organization verification queue.");
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const data = await fetchAdminOrganizationVerificationRequests({ status: "pending" });
        if (active) {
          setRequests(data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load organization verification queue.");
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

  const decide = async (requestId, payload) => {
    setActingId(requestId);
    try {
      setError("");
      await decideAdminOrganizationVerificationRequest(requestId, payload);
      setRequests((current) => current.filter((item) => item.id !== requestId));
    } catch (requestError) {
      setError(requestError.message || "Failed to review verification request.");
      throw requestError;
    } finally {
      setActingId(null);
    }
  };

  return {
    requests,
    loading,
    actingId,
    error,
    refresh: load,
    decide,
  };
}
