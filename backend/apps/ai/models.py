from django.conf import settings
from django.db import models

from apps.common.enums import (
    AIFeatureKey,
    AdaptiveCheckInMood,
    CognitiveMonitoringConsentStatus,
)


class CognitiveMonitoringConsentRecord(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cognitive_monitoring_consents",
    )
    feature_key = models.CharField(
        max_length=64,
        choices=AIFeatureKey.choices,
        default=AIFeatureKey.COGNITIVE_MONITORING,
    )
    status = models.CharField(
        max_length=32,
        choices=CognitiveMonitoringConsentStatus.choices,
        default=CognitiveMonitoringConsentStatus.ACTIVE,
    )
    policy_version = models.CharField(max_length=32)
    allowed_signals = models.JSONField(default=list, blank=True)
    surfaces = models.JSONField(default=list, blank=True)
    source_surface = models.CharField(max_length=64, blank=True)
    disclosure_acknowledged = models.BooleanField(default=False)
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["feature_key", "status"]),
            models.Index(fields=["granted_at"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.feature_key}:{self.status}"


class AdaptiveMonitoringCheckIn(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="adaptive_monitoring_checkins",
    )
    course_program = models.ForeignKey(
        "courses.CourseProgram",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="adaptive_monitoring_checkins",
    )
    surface = models.CharField(max_length=64, blank=True)
    mood_label = models.CharField(
        max_length=32,
        choices=AdaptiveCheckInMood.choices,
        default=AdaptiveCheckInMood.STEADY,
    )
    focus_level = models.PositiveSmallIntegerField(null=True, blank=True)
    energy_level = models.PositiveSmallIntegerField(null=True, blank=True)
    stress_level = models.PositiveSmallIntegerField(null=True, blank=True)
    reflection_note = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["course_program", "created_at"]),
            models.Index(fields=["mood_label", "created_at"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.mood_label}:{self.created_at:%Y-%m-%d}"
