from django.conf import settings
from django.db import models

from apps.common.enums import MatchSuggestionType, SkillSwapStatus


class MatchSuggestion(models.Model):
    source_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="generated_match_suggestions",
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_match_suggestions",
    )
    suggestion_type = models.CharField(
        max_length=32,
        choices=MatchSuggestionType.choices,
    )
    score = models.PositiveIntegerField(default=0)
    rationale = models.CharField(max_length=255)
    context_snapshot = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-score", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["source_user", "target_user"],
                name="unique_match_suggestion_per_source_target",
            )
        ]
        indexes = [
            models.Index(fields=["source_user", "suggestion_type"]),
            models.Index(fields=["target_user", "suggestion_type"]),
        ]

    def __str__(self):
        return f"{self.source_user.email} -> {self.target_user.email} ({self.suggestion_type})"


class SkillSwapRequest(models.Model):
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_swap_requests",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_swap_requests",
    )
    match_suggestion = models.ForeignKey(
        MatchSuggestion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="swap_requests",
    )
    status = models.CharField(
        max_length=16,
        choices=SkillSwapStatus.choices,
        default=SkillSwapStatus.PENDING,
    )
    message = models.TextField(blank=True)
    requester_note = models.CharField(max_length=255, blank=True)
    recipient_note = models.CharField(max_length=255, blank=True)
    cancelled_reason = models.CharField(max_length=255, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        indexes = [
            models.Index(fields=["requester", "status"]),
            models.Index(fields=["recipient", "status"]),
        ]

    def __str__(self):
        return f"{self.requester.email} -> {self.recipient.email} ({self.status})"


class SkillSwapStatusHistory(models.Model):
    swap_request = models.ForeignKey(
        SkillSwapRequest,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    from_status = models.CharField(
        max_length=16,
        choices=SkillSwapStatus.choices,
        blank=True,
    )
    to_status = models.CharField(
        max_length=16,
        choices=SkillSwapStatus.choices,
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="swap_status_changes",
    )
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["swap_request", "created_at"]),
        ]

    def __str__(self):
        return f"Swap {self.swap_request_id}: {self.from_status or 'none'} -> {self.to_status}"
