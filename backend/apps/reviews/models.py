from django.conf import settings
from django.db import models

from apps.common.enums import ReviewContext
from apps.courses.models import CourseProgram, Enrollment
from apps.events.models import Event, EventRSVP
from apps.swaps.models import SkillSwapRequest


class RatingReview(models.Model):
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submitted_reviews",
    )
    reviewee_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_reviews",
        null=True,
        blank=True,
    )
    context = models.CharField(
        max_length=16,
        choices=ReviewContext.choices,
    )
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    swap_request = models.ForeignKey(
        SkillSwapRequest,
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    course_program = models.ForeignKey(
        CourseProgram,
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    event_rsvp = models.ForeignKey(
        EventRSVP,
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="rating_review_score_between_1_and_5",
            ),
            models.UniqueConstraint(
                fields=["reviewer", "swap_request"],
                name="unique_skill_swap_review_per_reviewer",
            ),
            models.UniqueConstraint(
                fields=["reviewer", "enrollment"],
                name="unique_course_review_per_reviewer",
            ),
            models.UniqueConstraint(
                fields=["reviewer", "event_rsvp"],
                name="unique_event_review_per_reviewer",
            ),
        ]

    def __str__(self):
        return f"{self.reviewer_id} {self.context} review"
