from django.db import models

from django.conf import settings

from apps.common.enums import FinancialAccountStatus, PaymentTransactionStatus
from apps.organizations.models import Organization


class FinancialAccount(models.Model):
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name="financial_account",
    )
    provider = models.CharField(max_length=32, default="chapa")
    status = models.CharField(
        max_length=32,
        choices=FinancialAccountStatus.choices,
        default=FinancialAccountStatus.NOT_STARTED,
    )
    business_name = models.CharField(max_length=255, blank=True)
    account_holder_name = models.CharField(max_length=255, blank=True)
    bank_name = models.CharField(max_length=255, blank=True)
    bank_code = models.CharField(max_length=64, blank=True)
    account_number_last4 = models.CharField(max_length=4, blank=True)
    mobile_money_number = models.CharField(max_length=32, blank=True)
    setup_notes = models.TextField(blank=True)
    provider_account_reference = models.CharField(max_length=255, blank=True)
    restricted_reason = models.TextField(blank=True)
    review_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="reviewed_financial_accounts",
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["organization__name", "id"]

    def __str__(self):
        return f"{self.organization.name} ({self.status})"


class PaymentTransaction(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payment_transactions",
    )
    course_program = models.ForeignKey(
        "courses.CourseProgram",
        on_delete=models.PROTECT,
        related_name="payment_transactions",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="payment_transactions",
    )
    provider = models.CharField(max_length=32, default="chapa")
    tx_ref = models.CharField(max_length=128, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8)
    status = models.CharField(
        max_length=16,
        choices=PaymentTransactionStatus.choices,
        default=PaymentTransactionStatus.PENDING,
    )
    checkout_url = models.URLField(max_length=500, blank=True)
    callback_url = models.URLField(max_length=500, blank=True)
    return_url = models.URLField(max_length=500, blank=True)
    provider_reference = models.CharField(max_length=255, blank=True)
    provider_method = models.CharField(max_length=64, blank=True)
    provider_mode = models.CharField(max_length=16, blank=True)
    provider_charge = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    failure_reason = models.CharField(max_length=255, blank=True)
    verification_data = models.JSONField(default=dict, blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["user", "course_program", "status"]),
            models.Index(fields=["organization", "status"]),
        ]

    @property
    def enrollment_ready(self):
        return self.status == PaymentTransactionStatus.SUCCEEDED

    @property
    def receipt_url(self):
        if not self.provider_reference:
            return ""
        return f"https://chapa.link/payment-receipt/{self.provider_reference}"

    def __str__(self):
        return f"{self.tx_ref} ({self.status})"


class PaymentWebhookEvent(models.Model):
    event_key = models.CharField(max_length=64, unique=True)
    event_type = models.CharField(max_length=64)
    tx_ref = models.CharField(max_length=128, blank=True)
    provider_reference = models.CharField(max_length=255, blank=True)
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.event_type}: {self.tx_ref or self.provider_reference}"
