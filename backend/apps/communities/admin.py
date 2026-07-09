from django.contrib import admin

from apps.communities.models import CommunityGroup, CommunityMembership, CommunityPost


@admin.register(CommunityGroup)
class CommunityGroupAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "visibility", "is_active", "created_at")
    list_filter = ("visibility", "is_active")
    search_fields = ("title", "organization__name", "category")


@admin.register(CommunityMembership)
class CommunityMembershipAdmin(admin.ModelAdmin):
    list_display = ("community", "user", "role", "joined_at")
    list_filter = ("role",)
    search_fields = ("community__title", "user__email", "user__full_name")


@admin.register(CommunityPost)
class CommunityPostAdmin(admin.ModelAdmin):
    list_display = ("community", "author", "created_at")
    search_fields = ("community__title", "author__email", "body")

