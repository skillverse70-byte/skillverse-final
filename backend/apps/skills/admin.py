from django.contrib import admin

from apps.skills.models import FieldInterest, Skill, UserFieldInterest, UserSkill


@admin.register(FieldInterest)
class FieldInterestAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")


@admin.register(UserFieldInterest)
class UserFieldInterestAdmin(admin.ModelAdmin):
    list_display = ("user", "field_interest", "created_at")
    search_fields = ("user__email", "field_interest__name")
    readonly_fields = ("created_at",)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")


@admin.register(UserSkill)
class UserSkillAdmin(admin.ModelAdmin):
    list_display = ("user", "skill", "direction", "updated_at")
    list_filter = ("direction",)
    search_fields = ("user__email", "skill__name")
    readonly_fields = ("created_at", "updated_at")
