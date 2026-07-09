import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";

function buildQueryString(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") {
      return;
    }
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function normalizePaymentTransaction(transaction = {}) {
  return {
    ...transaction,
    amount:
      typeof transaction.amount === "number"
        ? transaction.amount
        : Number.parseFloat(transaction.amount || "0") || 0,
    currency: transaction.currency || "ETB",
    purpose: transaction.purpose || "course_enrollment",
    automation_status: transaction.automation_status || "none",
    automation_error: transaction.automation_error || "",
    fulfilled_at: transaction.fulfilled_at || null,
    checkout_url: transaction.checkout_url || "",
    provider_reference: transaction.provider_reference || "",
    provider_method: transaction.provider_method || "",
    provider_mode: transaction.provider_mode || "",
    failure_reason: transaction.failure_reason || "",
    enrollment_ready: transaction.enrollment_ready ?? false,
    receipt_url: transaction.receipt_url || "",
    is_community_service_payment: Boolean(transaction.is_community_service_payment),
    created_at: transaction.created_at || null,
    updated_at: transaction.updated_at || null,
    verified_at: transaction.verified_at || null,
    last_verified_at: transaction.last_verified_at || null,
    course_program: transaction.course_program
      ? {
          ...transaction.course_program,
          offering_type: transaction.course_program.offering_type || "standard",
          service_credit_hours:
            typeof transaction.course_program.service_credit_hours === "number"
              ? transaction.course_program.service_credit_hours
              : Number.parseFloat(transaction.course_program.service_credit_hours || "0") || 0,
          auto_issue_service_credit: Boolean(
            transaction.course_program.auto_issue_service_credit,
          ),
        }
      : null,
    organization: transaction.organization || null,
    user: transaction.user || null,
    service_credit_record: transaction.service_credit_record || null,
  };
}

export async function fetchPaymentTransactions(filters = {}) {
  const transactions = await authenticatedApiRequest(
    `/payments/course-checkouts/${buildQueryString(filters)}`,
    { method: "GET" },
  );
  return Array.isArray(transactions)
    ? transactions.map(normalizePaymentTransaction)
    : [];
}

export async function verifyPaymentTransaction(txRef) {
  const transaction = await authenticatedApiRequest(
    `/payments/course-checkouts/${encodeURIComponent(txRef)}/verify/`,
    { method: "POST" },
  );
  return normalizePaymentTransaction(transaction);
}

export async function retryPaymentAutomation(txRef) {
  const transaction = await authenticatedApiRequest(
    `/payments/course-checkouts/${encodeURIComponent(txRef)}/retry-automation/`,
    { method: "POST" },
  );
  return normalizePaymentTransaction(transaction);
}
