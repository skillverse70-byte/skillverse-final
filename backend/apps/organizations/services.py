from django.db import transaction
from django.utils import timezone

from apps.audit.services import record_audit_log
from apps.common.enums import (
    OrganizationVerificationReviewStatus,
    OrganizationVerificationStatus,
)
from apps.organizations.models import OrganizationVerificationRequest


def submit_organization_verification_request(*, organization, requested_by, request_notes=""):
    return OrganizationVerificationRequest.objects.create(
        organization=organization,
        requested_by=requested_by,
        request_notes=request_notes,
        status=OrganizationVerificationReviewStatus.PENDING,
    )


@transaction.atomic
def review_organization_verification_request(
    *,
    verification_request,
    reviewer,
    decision,
    reviewer_notes="",
    use_admin_override=False,
):
    verification_request.status = decision
    verification_request.reviewer_notes = reviewer_notes
    verification_request.used_admin_override = use_admin_override
    verification_request.reviewed_by = reviewer
    verification_request.reviewed_at = timezone.now()
    verification_request.save(
        update_fields=[
            "status",
            "reviewer_notes",
            "used_admin_override",
            "reviewed_by",
            "reviewed_at",
            "updated_at",
        ]
    )

    organization = verification_request.organization
    organization.verification_status = (
        OrganizationVerificationStatus.VERIFIED
        if decision == OrganizationVerificationReviewStatus.APPROVED
        else OrganizationVerificationStatus.UNVERIFIED
    )
    organization.save(update_fields=["verification_status", "updated_at"])

    record_audit_log(
        actor=reviewer,
        action="organization.verification.reviewed",
        target_type="organization_verification_request",
        target_id=verification_request.id,
        summary=(
            f"Verification request {verification_request.id} for "
            f"{organization.name} was {decision}."
        ),
        metadata={
            "organization_id": organization.id,
            "decision": decision,
            "used_admin_override": use_admin_override,
        },
    )

    from apps.notifications.services import notify_organization_verification_reviewed

    transaction.on_commit(
        lambda: notify_organization_verification_reviewed(verification_request)
    )
    return verification_request
