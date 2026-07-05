from django.conf import settings
from django.db import models

from apps.common.enums import OrganizationType, OrganizationVerificationStatus


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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name
