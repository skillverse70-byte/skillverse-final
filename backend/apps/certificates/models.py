import secrets

from django.conf import settings
from django.db import models

from apps.common.enums import CertificateSourceType, CertificateStatus, ServiceCreditStatus
from apps.communities.models import CommunityGroup
from apps.courses.models import CourseProgram
from apps.events.models import Event
from apps.organizations.models import Organization


def generate_certificate_id():
    return f"SV-CERT-{secrets.token_hex(4).upper()}"


class ServiceCreditRecord(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="service_credit_records",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="service_credit_records",
    )
    community_group = models.ForeignKey(
        CommunityGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_credit_records",
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_credit_records",
    )
    course_program = models.ForeignKey(
        CourseProgram,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_credit_records",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    credit_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    status = models.CharField(
        max_length=24,
        choices=ServiceCreditStatus.choices,
        default=ServiceCreditStatus.ISSUED,
    )
    evidence_note = models.TextField(blank=True)
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_service_credit_records",
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-issued_at", "-id"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.user.email})"


class Certificate(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="issued_certificates",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certificates",
    )
    service_credit = models.ForeignKey(
        ServiceCreditRecord,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificates",
    )
    course_program = models.ForeignKey(
        CourseProgram,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificates",
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificates",
    )
    certificate_id = models.CharField(max_length=32, unique=True, default=generate_certificate_id)
    source_type = models.CharField(
        max_length=32,
        choices=CertificateSourceType.choices,
    )
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    signature_label = models.CharField(max_length=255, default="SkillVerse Verified")
    status = models.CharField(
        max_length=24,
        choices=CertificateStatus.choices,
        default=CertificateStatus.ACTIVE,
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_certificates",
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-issued_at", "-id"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["source_type", "status"]),
        ]

    def __str__(self):
        return self.certificate_id

