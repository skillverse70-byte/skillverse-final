from django.contrib import admin

from apps.organizations.models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "type",
        "verification_status",
        "contact_email",
        "country",
        "location",
        "owner",
    )
    list_filter = ("type", "verification_status")
    search_fields = ("name", "contact_email", "owner__email")
    readonly_fields = ("created_at", "updated_at")
