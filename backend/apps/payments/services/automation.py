from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.audit.services import record_audit_log
from apps.certificates.models import ServiceCreditRecord
from apps.common.enums import (
    CourseOfferingType,
    OrganizationVerificationStatus,
    PaymentAutomationStatus,
    PaymentTransactionPurpose,
    PaymentTransactionStatus,
    ServiceCreditStatus,
)


def process_community_service_completion(enrollment, *, actor=None, source="system"):
    course_program = enrollment.course_program
    if course_program.offering_type != CourseOfferingType.COMMUNITY_SERVICE:
        return None
    if not course_program.auto_issue_service_credit:
        return None

    payment_transaction = _community_service_transaction_for_enrollment(enrollment)
    try:
        service_credit = _issue_service_credit(enrollment, actor=actor, source=source)
    except Exception as exc:  # pragma: no cover - defensive state capture
        if payment_transaction is not None:
            payment_transaction.automation_status = PaymentAutomationStatus.FAILED
            payment_transaction.automation_error = str(exc)[:500]
            payment_transaction.save(
                update_fields=["automation_status", "automation_error", "updated_at"]
            )
        record_audit_log(
            actor=actor,
            action="payment.automation.failed",
            target_type="payment_transaction" if payment_transaction else "course_program",
            target_id=payment_transaction.id if payment_transaction else course_program.id,
            summary=(
                f"Community-service automation failed for {course_program.title}."
            ),
            metadata={
                "source": source,
                "course_program_id": course_program.id,
                "organization_id": course_program.organization_id,
                "user_id": enrollment.user_id,
                "error": str(exc)[:500],
                "tx_ref": payment_transaction.tx_ref if payment_transaction else "",
            },
        )
        raise

    if payment_transaction is not None:
        payment_transaction.service_credit_record = service_credit
        payment_transaction.automation_status = PaymentAutomationStatus.COMPLETED
        payment_transaction.automation_error = ""
        payment_transaction.fulfilled_at = payment_transaction.fulfilled_at or timezone.now()
        payment_transaction.save(
            update_fields=[
                "service_credit_record",
                "automation_status",
                "automation_error",
                "fulfilled_at",
                "updated_at",
            ]
        )
        record_audit_log(
            actor=actor,
            action="payment.automation.completed",
            target_type="payment_transaction",
            target_id=payment_transaction.id,
            summary=(
                f"Community-service fulfillment completed for {course_program.title}."
            ),
            metadata={
                "source": source,
                "course_program_id": course_program.id,
                "organization_id": course_program.organization_id,
                "user_id": enrollment.user_id,
                "service_credit_record_id": service_credit.id,
                "tx_ref": payment_transaction.tx_ref,
            },
        )
    return service_credit


def retry_community_service_automation(payment_transaction, *, actor=None, source="manual_retry"):
    if payment_transaction.purpose != PaymentTransactionPurpose.COMMUNITY_SERVICE_ENROLLMENT:
        raise ValueError("This payment does not use community-service automation.")
    if payment_transaction.status != PaymentTransactionStatus.SUCCEEDED:
        raise ValueError("Only verified payments can retry community-service automation.")

    from apps.courses.models import Enrollment

    enrollment = (
        Enrollment.objects.select_related("course_program", "course_program__organization", "user")
        .filter(
            user=payment_transaction.user,
            course_program=payment_transaction.course_program,
            status="completed",
        )
        .first()
    )
    if enrollment is None:
        raise ValueError("A completed enrollment is required before automation can run.")

    return process_community_service_completion(enrollment, actor=actor, source=source)


def _community_service_transaction_for_enrollment(enrollment):
    from apps.payments.models import PaymentTransaction

    return (
        PaymentTransaction.objects.filter(
            user=enrollment.user,
            course_program=enrollment.course_program,
            status=PaymentTransactionStatus.SUCCEEDED,
            purpose=PaymentTransactionPurpose.COMMUNITY_SERVICE_ENROLLMENT,
        )
        .order_by("-verified_at", "-updated_at", "-id")
        .first()
    )


def _issue_service_credit(enrollment, *, actor=None, source="system"):
    course_program = enrollment.course_program
    organization = course_program.organization
    if organization.verification_status != OrganizationVerificationStatus.VERIFIED:
        raise ValueError(
            "Only verified organizations can issue automatic service-credit records."
        )

    existing = ServiceCreditRecord.objects.filter(
        organization=organization,
        user=enrollment.user,
        course_program=course_program,
        status=ServiceCreditStatus.ISSUED,
    ).first()
    if existing is not None:
        return existing

    title = (
        course_program.service_credit_title.strip()
        if course_program.service_credit_title
        else f"{course_program.title} Service Credit"
    )
    description = (
        course_program.service_credit_description.strip()
        if course_program.service_credit_description
        else f"Verified completion of {course_program.title} community-service offering."
    )
    credit_hours = Decimal(str(course_program.service_credit_hours or "0"))
    if credit_hours <= 0:
        raise ValueError(
            "Automatic service-credit issuance requires a positive credit-hour value."
        )

    with transaction.atomic():
        service_credit = ServiceCreditRecord.objects.create(
            organization=organization,
            user=enrollment.user,
            course_program=course_program,
            title=title,
            description=description,
            credit_hours=credit_hours,
            status=ServiceCreditStatus.ISSUED,
            evidence_note=(
                f"Automatically issued after completed enrollment in {course_program.title}."
            ),
            issued_by=actor if getattr(actor, "role", "") == "organization" else organization.owner,
        )

    from apps.notifications.services import notify_service_credit_issued

    notify_service_credit_issued(service_credit)
    record_audit_log(
        actor=actor,
        action="service_credit.automation.issued",
        target_type="service_credit",
        target_id=service_credit.id,
        summary=f"Automatic service credit issued for {course_program.title}.",
        metadata={
            "source": source,
            "course_program_id": course_program.id,
            "organization_id": organization.id,
            "user_id": enrollment.user_id,
            "credit_hours": str(service_credit.credit_hours),
        },
    )
    return service_credit
