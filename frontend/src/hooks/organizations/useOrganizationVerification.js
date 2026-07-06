import { useEffect, useState } from "react";
import {
  fetchOrganizationVerificationOverview,
  submitOrganizationVerificationRequest,
} from "@/services/organizations/organization.service";

export function useOrganizationVerification() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const data = await fetchOrganizationVerificationOverview();
      setOverview(data);
      return data;
    } catch (requestError) {
      setError(requestError.message || "Failed to load verification status.");
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const data = await fetchOrganizationVerificationOverview();
        if (active) {
          setOverview(data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load verification status.");
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

  const submitRequest = async (requestNotes = "") => {
    setSubmitting(true);
    try {
      setError("");
      await submitOrganizationVerificationRequest({ requestNotes });
      return await load();
    } catch (requestError) {
      setError(requestError.message || "Failed to submit verification request.");
      throw requestError;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    overview,
    loading,
    submitting,
    error,
    refresh: load,
    submitRequest,
  };
}
