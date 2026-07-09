import { apiRequest } from "@/lib/http-client";
import { authenticatedApiRequest } from "@/services/auth/backend-auth-client";
import { normalizeCommunity } from "@/services/communities/communities.service";
import { normalizeCourse } from "@/services/courses/courses.service";
import { normalizeEvent } from "@/services/events/events.service";

function normalizeOrganization(organization) {
  if (!organization) {
    return null;
  }
  return {
    id: organization.id ?? null,
    name: organization.name || "",
    verification_status: organization.verification_status || "unverified",
  };
}

function normalizeActor(actor) {
  if (!actor) {
    return null;
  }
  return {
    id: actor.id ?? null,
    full_name: actor.full_name || "",
    email: actor.email || "",
    role: actor.role || "",
  };
}

export function normalizeServiceCredit(record = {}) {
  return {
    id: record.id ?? null,
    title: record.title || "",
    description: record.description || "",
    credit_hours: Number(record.credit_hours || 0),
    status: record.status || "issued",
    evidence_note: record.evidence_note || "",
    issued_at: record.issued_at || null,
    organization: normalizeOrganization(record.organization),
    user: normalizeActor(record.user),
    community_group: record.community_group ? normalizeCommunity(record.community_group) : null,
    event: record.event ? normalizeEvent(record.event) : null,
    course_program: record.course_program ? normalizeCourse(record.course_program) : null,
  };
}

export function normalizeCertificate(certificate = {}) {
  return {
    id: certificate.id ?? null,
    certificate_id: certificate.certificate_id || "",
    source_type: certificate.source_type || "",
    title: certificate.title || "",
    summary: certificate.summary || "",
    signature_label: certificate.signature_label || "SkillVerse Verified",
    status: certificate.status || "active",
    issued_at: certificate.issued_at || null,
    organization: normalizeOrganization(certificate.organization),
    user: normalizeActor(certificate.user),
    service_credit: certificate.service_credit
      ? normalizeServiceCredit(certificate.service_credit)
      : null,
    course_program: certificate.course_program
      ? normalizeCourse(certificate.course_program)
      : null,
    event: certificate.event ? normalizeEvent(certificate.event) : null,
  };
}

function normalizeEligibility(entry = {}) {
  return {
    user: normalizeActor(entry.user),
    course: entry.course ? normalizeCourse(entry.course) : null,
    event: entry.event ? normalizeEvent(entry.event) : null,
    service_credit: entry.service_credit ? normalizeServiceCredit(entry.service_credit) : null,
    source_type: entry.source_type || "",
    certificate_already_issued: Boolean(entry.certificate_already_issued),
  };
}

export async function fetchCertificatePortfolio() {
  const payload = await authenticatedApiRequest("/certificates/portfolio/", {
    method: "GET",
  });
  return {
    certificates: Array.isArray(payload.certificates)
      ? payload.certificates.map(normalizeCertificate)
      : [],
    service_credits: Array.isArray(payload.service_credits)
      ? payload.service_credits.map(normalizeServiceCredit)
      : [],
  };
}

export async function fetchCertificateDetail(certificateId) {
  const payload = await apiRequest(`/certificates/${certificateId}/`, {
    method: "GET",
  });
  return normalizeCertificate(payload);
}

export async function fetchOrganizationTrustOverview() {
  const payload = await authenticatedApiRequest("/organizations/trust/overview/", {
    method: "GET",
  });
  return {
    communities: Array.isArray(payload.communities)
      ? payload.communities.map(normalizeCommunity)
      : [],
    service_credits: Array.isArray(payload.service_credits)
      ? payload.service_credits.map(normalizeServiceCredit)
      : [],
    certificates: Array.isArray(payload.certificates)
      ? payload.certificates.map(normalizeCertificate)
      : [],
    eligible_course_completions: Array.isArray(payload.eligible_course_completions)
      ? payload.eligible_course_completions.map(normalizeEligibility)
      : [],
    eligible_event_attendances: Array.isArray(payload.eligible_event_attendances)
      ? payload.eligible_event_attendances.map(normalizeEligibility)
      : [],
    eligible_service_credit_certificates: Array.isArray(payload.eligible_service_credit_certificates)
      ? payload.eligible_service_credit_certificates.map(normalizeEligibility)
      : [],
  };
}

export async function issueOrganizationServiceCredit(payload) {
  const record = await authenticatedApiRequest("/organizations/trust/service-credits/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeServiceCredit(record);
}

export async function issueOrganizationCertificate(payload) {
  const certificate = await authenticatedApiRequest("/organizations/trust/certificates/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return normalizeCertificate(certificate);
}

export async function revokeOrganizationServiceCredit(recordId, reason = "") {
  const record = await authenticatedApiRequest(
    `/organizations/trust/service-credits/${recordId}/revoke/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );
  return normalizeServiceCredit(record);
}

export async function revokeOrganizationCertificate(certificateId, reason = "") {
  const certificate = await authenticatedApiRequest(
    `/organizations/trust/certificates/${certificateId}/revoke/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );
  return normalizeCertificate(certificate);
}

export async function fetchAdminTrustOverview() {
  const payload = await authenticatedApiRequest("/admin/trust/overview/", {
    method: "GET",
  });
  return {
    communities: Array.isArray(payload.communities)
      ? payload.communities.map(normalizeCommunity)
      : [],
    service_credits: Array.isArray(payload.service_credits)
      ? payload.service_credits.map(normalizeServiceCredit)
      : [],
    certificates: Array.isArray(payload.certificates)
      ? payload.certificates.map(normalizeCertificate)
      : [],
  };
}

export async function revokeAdminServiceCredit(recordId, reason = "") {
  const record = await authenticatedApiRequest(
    `/admin/trust/service-credits/${recordId}/revoke/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );
  return normalizeServiceCredit(record);
}

export async function revokeAdminCertificate(certificateId, reason = "") {
  const certificate = await authenticatedApiRequest(
    `/admin/trust/certificates/${certificateId}/revoke/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );
  return normalizeCertificate(certificate);
}
