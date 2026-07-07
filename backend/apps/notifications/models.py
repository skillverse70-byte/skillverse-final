from django.conf import settings
from django.db import models

from apps.common.enums import NotificationType


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(
        max_length=32,
        choices=NotificationType.choices,
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    action_url = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    emailed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["user", "is_read", "created_at"]),
            models.Index(fields=["user", "type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.user.email}: {self.title}"

