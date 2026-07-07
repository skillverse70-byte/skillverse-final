from django.conf import settings
from django.db import models

from apps.common.enums import ExperienceLevel, JobApplicationStatus, OpportunityStatus, OpportunityType
from apps.organizations.models import Organization


class Opportunity(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="opportunities",
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(
        max_length=32,
        choices=OpportunityType.choices,
        default=OpportunityType.JOB,
    )
    status = models.CharField(
        max_length=16,
        choices=OpportunityStatus.choices,
        default=OpportunityStatus.DRAFT,
    )
    category = models.CharField(max_length=120, blank=True)
    location = models.CharField(max_length=255, blank=True)
    is_remote = models.BooleanField(default=False)
    experience_level = models.CharField(
        max_length=32,
        choices=ExperienceLevel.choices,
        blank=True,
    )
    salary_range = models.CharField(max_length=120, blank=True)
    deadline = models.DateField(null=True, blank=True)
    required_skills = models.JSONField(default=list, blank=True)
    field_signals = models.JSONField(default=list, blank=True)
    related_course_ids = models.JSONField(default=list, blank=True)
    verified_activity_signals = models.JSONField(default=list, blank=True)
    admin_review_notes = models.TextField(blank=True)
    admin_reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_opportunities",
    )
    admin_reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.title


class JobApplication(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_applications",
    )
    opportunity = models.ForeignKey(
        Opportunity,
        on_delete=models.CASCADE,
        related_name="applications",
    )
    status = models.CharField(
        max_length=16,
        choices=JobApplicationStatus.choices,
        default=JobApplicationStatus.APPLIED,
    )
    cover_letter = models.TextField(blank=True)
    reviewer_notes = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "opportunity"],
                name="unique_job_application_per_user_opportunity",
            )
        ]

    def __str__(self):
        return f"{self.user.email} -> {self.opportunity.title}"
