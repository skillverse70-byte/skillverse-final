import {
  financialAccountStatuses,
  organizationVerificationStatuses,
} from "@/lib/domain-enums";

const verificationAliases = {
  pending: organizationVerificationStatuses.unverified,
  rejected: organizationVerificationStatuses.unverified,
  unverified: organizationVerificationStatuses.unverified,
  verified: organizationVerificationStatuses.verified,
};

export function normalizeVerificationStatus(status, isVerified = false) {
  if (isVerified) {
    return organizationVerificationStatuses.verified;
  }

  return verificationAliases[status] || organizationVerificationStatuses.unverified;
}

export function isVerifiedOrganization(organization) {
  if (!organization) {
    return false;
  }

  return (
    normalizeVerificationStatus(
      organization.verification_status,
      organization.is_verified,
    ) === organizationVerificationStatuses.verified
  );
}

export function isFinancialAccountReady(financialAccount) {
  return financialAccount?.status === financialAccountStatuses.ready;
}

export function getOrganizationTrustBadgeState(organization) {
  const status = normalizeVerificationStatus(
    organization?.verification_status,
    organization?.is_verified,
  );

  return {
    status,
    label:
      status === organizationVerificationStatuses.verified
        ? "Verified"
        : "Unverified",
  };
}

export function getPaidCourseEnrollmentGate({
  organization,
  financialAccount = null,
  isFree = true,
  enrollmentOpen = true,
}) {
  if (isFree) {
    return {
      status: enrollmentOpen ? "open" : "enrollment_unavailable",
      canPublishPaid: false,
      canEnroll: enrollmentOpen,
      label: enrollmentOpen ? "Enrollment Open" : "Enrollment Unavailable",
      reason: enrollmentOpen ? "free_course_open" : "manual_closure",
    };
  }

  if (!isVerifiedOrganization(organization)) {
    return {
      status: "enrollment_unavailable",
      canPublishPaid: false,
      canEnroll: false,
      label: "Enrollment Unavailable",
      reason: "organization_unverified",
    };
  }

  if (!isFinancialAccountReady(financialAccount)) {
    return {
      status: "enrollment_unavailable",
      canPublishPaid: true,
      canEnroll: false,
      label: "Enrollment Unavailable",
      reason: "financial_setup_incomplete",
    };
  }

  return {
    status: enrollmentOpen ? "open" : "enrollment_unavailable",
    canPublishPaid: true,
    canEnroll: enrollmentOpen,
    label: enrollmentOpen ? "Enrollment Open" : "Enrollment Unavailable",
    reason: enrollmentOpen ? "eligible" : "manual_closure",
  };
}
