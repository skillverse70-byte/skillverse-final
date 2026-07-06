from django.conf import settings
from django.db import models

from apps.common.enums import LearningSessionStatus
from apps.swaps.models import SkillSwapRequest


class LearningSession(models.Model):
    swap_request = models.ForeignKey(
        SkillSwapRequest,
        on_delete=models.CASCADE,
        related_name="learning_sessions",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_learning_sessions",
    )
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=LearningSessionStatus.choices,
        default=LearningSessionStatus.PLANNED,
    )
    scheduled_start_at = models.DateTimeField()
    scheduled_end_at = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=64, blank=True)
    meeting_url = models.URLField(blank=True)
    meeting_notes = models.CharField(max_length=255, blank=True)
    location_note = models.CharField(max_length=255, blank=True)
    completion_notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_start_at", "id"]
        indexes = [
            models.Index(fields=["swap_request", "status"]),
            models.Index(fields=["scheduled_start_at"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"

