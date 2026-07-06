from django.contrib import admin

from apps.organizations.models import Organization, OrganizationVerificationRequest


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "type",
        "verification_status",
        "contact_email",
        "website_url",
        "country",
        "location",
        "owner",
    )
    list_filter = ("type", "verification_status")
    search_fields = ("name", "contact_email", "website_url", "owner__email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(OrganizationVerificationRequest)
class OrganizationVerificationRequestAdmin(admin.ModelAdmin):
    list_display = (
        "organization",
        "status",
        "requested_by",
        "reviewed_by",
        "used_admin_override",
        "submitted_at",
    )
    list_filter = ("status", "used_admin_override", "submitted_at")
    search_fields = ("organization__name", "requested_by__email", "reviewed_by__email")
