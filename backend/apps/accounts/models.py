import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from apps.accounts.managers import UserManager
from apps.common.enums import Role


class User(AbstractUser):
    username = None
    first_name = None
    last_name = None

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        default=Role.REGULAR_USER,
    )
    email_verified_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def save(self, *args, **kwargs):
        if self.is_staff or self.is_superuser:
            self.role = Role.ADMIN
        super().save(*args, **kwargs)

    @property
    def is_email_verified(self):
        return self.email_verified_at is not None

    def mark_email_verified(self):
        self.email_verified_at = timezone.now()
        self.save(update_fields=["email_verified_at"])


class AccountActionToken(models.Model):
    class Purpose(models.TextChoices):
        EMAIL_VERIFICATION = "email_verification", "Email Verification"
        PASSWORD_RESET = "password_reset", "Password Reset"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="action_tokens",
    )
    purpose = models.CharField(max_length=32, choices=Purpose.choices)
    token = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["purpose", "user"]),
            models.Index(fields=["purpose", "expires_at"]),
        ]

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])

    @property
    def is_active(self):
        return self.used_at is None and self.expires_at > timezone.now()

    @classmethod
    def issue_email_verification(cls, user):
        cls.objects.filter(
            user=user,
            purpose=cls.Purpose.EMAIL_VERIFICATION,
            used_at__isnull=True,
        ).update(used_at=timezone.now())
        return cls.objects.create(
            user=user,
            purpose=cls.Purpose.EMAIL_VERIFICATION,
            token=f"{secrets.randbelow(1_000_000):06d}",
            expires_at=timezone.now() + timedelta(minutes=15),
        )

    @classmethod
    def issue_password_reset(cls, user):
        cls.objects.filter(
            user=user,
            purpose=cls.Purpose.PASSWORD_RESET,
            used_at__isnull=True,
        ).update(used_at=timezone.now())
        return cls.objects.create(
            user=user,
            purpose=cls.Purpose.PASSWORD_RESET,
            token=secrets.token_urlsafe(32),
            expires_at=timezone.now() + timedelta(hours=1),
        )

