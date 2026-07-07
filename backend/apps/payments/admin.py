from django.contrib import admin

from apps.payments.models import (
    FinancialAccount,
    PaymentTransaction,
    PaymentWebhookEvent,
)


@admin.register(FinancialAccount)
class FinancialAccountAdmin(admin.ModelAdmin):
    list_display = (
        "organization",
        "provider",
        "status",
        "account_holder_name",
        "bank_name",
        "updated_at",
    )
    list_filter = ("provider", "status")
    search_fields = (
        "organization__name",
        "organization__owner__email",
        "account_holder_name",
        "bank_name",
        "provider_account_reference",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "submitted_at",
        "verified_at",
        "reviewed_at",
    )


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "tx_ref",
        "user",
        "course_program",
        "amount",
        "currency",
        "status",
        "created_at",
    )
    list_filter = ("provider", "status", "currency")
    search_fields = (
        "tx_ref",
        "provider_reference",
        "user__email",
        "course_program__title",
        "organization__name",
    )
    readonly_fields = (
        "tx_ref",
        "verification_data",
        "last_verified_at",
        "verified_at",
        "created_at",
        "updated_at",
    )


@admin.register(PaymentWebhookEvent)
class PaymentWebhookEventAdmin(admin.ModelAdmin):
    list_display = (
        "event_type",
        "tx_ref",
        "provider_reference",
        "processed",
        "created_at",
    )
    list_filter = ("event_type", "processed")
    search_fields = ("event_key", "tx_ref", "provider_reference")
    readonly_fields = (
        "event_key",
        "event_type",
        "tx_ref",
        "provider_reference",
        "processed",
        "processed_at",
        "created_at",
    )
