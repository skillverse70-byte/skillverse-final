from django.contrib import admin

from apps.certificates.models import Certificate, ServiceCreditRecord


@admin.register(ServiceCreditRecord)
class ServiceCreditRecordAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "user", "credit_hours", "status", "issued_at")
    list_filter = ("status",)
    search_fields = ("title", "organization__name", "user__email", "user__full_name")


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ("certificate_id", "title", "organization", "user", "source_type", "status", "issued_at")
    list_filter = ("source_type", "status")
    search_fields = ("certificate_id", "title", "organization__name", "user__email", "user__full_name")

