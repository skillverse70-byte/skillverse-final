import { useEffect, useState } from "react";
import {
  decideAdminFinancialAccount,
  fetchAdminFinancialAccounts,
} from "@/services/organizations/organization.service";

export function useAdminFinancialAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await fetchAdminFinancialAccounts({ status: "pending" });
        if (active) {
          setAccounts(data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Failed to load financial review queue.");
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
  }, []);

  const decide = async (accountId, payload) => {
    setActingId(accountId);
    try {
      setError("");
      await decideAdminFinancialAccount(accountId, payload);
      setAccounts((current) => current.filter((item) => item.id !== accountId));
    } catch (requestError) {
      setError(requestError.message || "Failed to review financial account.");
      throw requestError;
    } finally {
      setActingId(null);
    }
  };

  return {
    accounts,
    loading,
    actingId,
    error,
    decide,
  };
}
