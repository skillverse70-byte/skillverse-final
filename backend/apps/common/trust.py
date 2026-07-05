from apps.common.enums import FinancialAccountStatus, OrganizationVerificationStatus

LEGACY_VERIFICATION_ALIASES = {
    "pending": OrganizationVerificationStatus.UNVERIFIED,
    "rejected": OrganizationVerificationStatus.UNVERIFIED,
    "unverified": OrganizationVerificationStatus.UNVERIFIED,
    "verified": OrganizationVerificationStatus.VERIFIED,
}


def normalize_verification_status(status):
    if not status:
        return OrganizationVerificationStatus.UNVERIFIED
    return LEGACY_VERIFICATION_ALIASES.get(status, status)


def is_verified_organization(organization):
    if not organization:
        return False

    status = normalize_verification_status(getattr(organization, "verification_status", None))
    if status == OrganizationVerificationStatus.VERIFIED:
        return True

    if getattr(organization, "is_verified", False):
        return True

    return False


def is_financial_account_ready(financial_account):
    if not financial_account:
        return False

    status = getattr(financial_account, "status", None)
    return status == FinancialAccountStatus.READY


def can_organization_create_paid_course(organization, has_required_verification_evidence=True):
    return is_verified_organization(organization) and has_required_verification_evidence


def get_paid_course_enrollment_gate(organization, financial_account=None):
    if not is_verified_organization(organization):
        return {
            "can_publish_paid": False,
            "can_enroll": False,
            "label": "Enrollment Unavailable",
            "reason": "organization_unverified",
        }

    if not is_financial_account_ready(financial_account):
        return {
            "can_publish_paid": True,
            "can_enroll": False,
            "label": "Enrollment Unavailable",
            "reason": "financial_setup_incomplete",
        }

    return {
        "can_publish_paid": True,
        "can_enroll": True,
        "label": "Enrollment Open",
        "reason": "eligible",
    }
