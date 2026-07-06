from django.conf import settings
from django.db import models

from apps.common.enums import CourseProgramStatus, EnrollmentStatus, LessonItemType
from apps.organizations.models import Organization


class CourseProgram(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="course_programs",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=120, blank=True)
    difficulty = models.CharField(max_length=32, default="beginner")
    instructor_name = models.CharField(max_length=255, blank=True)
    tags = models.JSONField(default=list, blank=True)
    is_free = models.BooleanField(default=True)
    price_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_currency = models.CharField(max_length=8, default="ETB")
    enrollment_open = models.BooleanField(default=True)
    status = models.CharField(
        max_length=16,
        choices=CourseProgramStatus.choices,
        default=CourseProgramStatus.DRAFT,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title", "id"]

    def __str__(self):
        return self.title


class CourseModule(models.Model):
    course_program = models.ForeignKey(
        CourseProgram,
        on_delete=models.CASCADE,
        related_name="modules",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.course_program.title}: {self.title}"


class LessonItem(models.Model):
    module = models.ForeignKey(
        CourseModule,
        on_delete=models.CASCADE,
        related_name="lesson_items",
    )
    title = models.CharField(max_length=255)
    item_type = models.CharField(
        max_length=32,
        choices=LessonItemType.choices,
    )
    description = models.TextField(blank=True)
    content_url = models.URLField(blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)
    progression_gate = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.module.title}: {self.title}"


class Enrollment(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="course_enrollments",
    )
    course_program = models.ForeignKey(
        CourseProgram,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    status = models.CharField(
        max_length=16,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.PENDING,
    )
    progress_percent = models.PositiveIntegerField(default=0)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "course_program"],
                name="unique_enrollment_per_user_course",
            )
        ]

    def __str__(self):
        return f"{self.user.email} -> {self.course_program.title}"


class EnrollmentLessonProgress(models.Model):
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="lesson_progresses",
    )
    lesson_item = models.ForeignKey(
        LessonItem,
        on_delete=models.CASCADE,
        related_name="enrollment_progresses",
    )
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["lesson_item__sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["enrollment", "lesson_item"],
                name="unique_lesson_progress_per_enrollment",
            )
        ]

    def __str__(self):
        return f"{self.enrollment_id} -> {self.lesson_item_id}"
