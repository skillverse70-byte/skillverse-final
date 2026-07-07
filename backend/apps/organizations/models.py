from django.conf import settings
from django.db import models

from apps.common.enums import (
    OrganizationType,
    OrganizationVerificationReviewStatus,
    OrganizationVerificationStatus,
)


def business_license_upload_path(instance, filename):
    return f"organizations/licenses/{instance.owner_id}/{filename}"


class Organization(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organization_profile",
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=32, choices=OrganizationType.choices)
    description = models.TextField()
    contact_email = models.EmailField()
    country = models.CharField(max_length=120, blank=True)
    location = models.CharField(max_length=255, blank=True)
    website_url = models.URLField(blank=True)
    contact_phone = models.CharField(max_length=32, blank=True)
    offerings_summary = models.TextField(blank=True)
    verification_status = models.CharField(
        max_length=32,
        choices=OrganizationVerificationStatus.choices,
        default=OrganizationVerificationStatus.UNVERIFIED,
    )
    business_license = models.FileField(
        upload_to=business_license_upload_path,
        blank=True,
        null=True,
    )
    is_suspended = models.BooleanField(default=False)
    suspension_reason = models.TextField(blank=True)
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderated_organizations",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name


class OrganizationVerificationRequest(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="verification_requests",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submitted_organization_verification_requests",
    )
    status = models.CharField(
        max_length=16,
        choices=OrganizationVerificationReviewStatus.choices,
        default=OrganizationVerificationReviewStatus.PENDING,
    )
    request_notes = models.TextField(blank=True)
    reviewer_notes = models.TextField(blank=True)
    used_admin_override = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_organization_verification_requests",
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at", "-id"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["status", "submitted_at"]),
        ]

    def __str__(self):
        return f"{self.organization.name} ({self.status})"
