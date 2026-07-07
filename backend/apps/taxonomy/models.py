from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.common.enums import TaxonomyDomain, TaxonomySuggestionStatus
from apps.organizations.models import Organization


class ManagedCategory(models.Model):
    domain = models.CharField(max_length=32, choices=TaxonomyDomain.choices)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_managed_categories",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["domain", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["domain", "slug"],
                name="unique_managed_category_domain_slug",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_domain_display()}: {self.name}"


class CategorySuggestion(models.Model):
    domain = models.CharField(max_length=32, choices=TaxonomyDomain.choices)
    name = models.CharField(max_length=120)
    normalized_slug = models.SlugField(max_length=140)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=TaxonomySuggestionStatus.choices,
        default=TaxonomySuggestionStatus.PENDING,
    )
    suggested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="taxonomy_suggestions",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="taxonomy_suggestions",
    )
    reviewer_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_taxonomy_suggestions",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    resolved_entry_name = models.CharField(max_length=120, blank=True)
    resolved_entry_slug = models.SlugField(max_length=140, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "-created_at", "-id"]
        indexes = [
            models.Index(fields=["domain", "status"]),
            models.Index(fields=["suggested_by", "status"]),
            models.Index(fields=["normalized_slug", "status"]),
        ]

    def save(self, *args, **kwargs):
        self.normalized_slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_domain_display()}: {self.name} ({self.status})"

