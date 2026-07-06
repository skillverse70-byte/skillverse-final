from django.conf import settings
from django.db import models

from apps.swaps.models import SkillSwapRequest


class MessageThread(models.Model):
    swap_request = models.OneToOneField(
        SkillSwapRequest,
        on_delete=models.CASCADE,
        related_name="message_thread",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_message_threads",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        indexes = [
            models.Index(fields=["updated_at"]),
        ]

    def __str__(self):
        return f"Thread for swap {self.swap_request_id}"


class ThreadMessage(models.Model):
    class MessageType(models.TextChoices):
        TEXT = "text", "Text"
        RESOURCE = "resource", "Resource"

    thread = models.ForeignKey(
        MessageThread,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="thread_messages",
    )
    message_type = models.CharField(
        max_length=16,
        choices=MessageType.choices,
        default=MessageType.TEXT,
    )
    content = models.TextField(blank=True)
    resource_url = models.URLField(blank=True)
    resource_label = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["thread", "created_at"]),
            models.Index(fields=["sender", "created_at"]),
        ]

    def __str__(self):
        return f"Message {self.id} in thread {self.thread_id}"
