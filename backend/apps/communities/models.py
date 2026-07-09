from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.common.enums import CommunityMembershipRole, CommunityVisibility
from apps.courses.models import CourseProgram
from apps.events.models import Event
from apps.organizations.models import Organization


class CommunityGroup(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="community_groups",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_community_groups",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=120, blank=True)
    tags = models.JSONField(default=list, blank=True)
    visibility = models.CharField(
        max_length=24,
        choices=CommunityVisibility.choices,
        default=CommunityVisibility.PUBLIC,
    )
    related_course = models.ForeignKey(
        CourseProgram,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="community_groups",
    )
    related_event = models.ForeignKey(
        Event,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="community_groups",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["title", "id"]
        indexes = [
            models.Index(fields=["organization", "is_active"]),
            models.Index(fields=["visibility", "is_active"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:220] or "community"
            slug = base_slug
            suffix = 1
            while CommunityGroup.objects.exclude(pk=self.pk).filter(slug=slug).exists():
                suffix += 1
                slug = f"{base_slug[:220]}-{suffix}"
            self.slug = slug
        super().save(*args, **kwargs)


class CommunityMembership(models.Model):
    community = models.ForeignKey(
        CommunityGroup,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_memberships",
    )
    role = models.CharField(
        max_length=24,
        choices=CommunityMembershipRole.choices,
        default=CommunityMembershipRole.MEMBER,
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-joined_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["community", "user"],
                name="unique_community_membership",
            )
        ]

    def __str__(self):
        return f"{self.user.email} -> {self.community.title}"


class CommunityPost(models.Model):
    community = models.ForeignKey(
        CommunityGroup,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="community_posts",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["community", "created_at"]),
        ]

    def __str__(self):
        return f"{self.community.title} by {self.author.email}"

