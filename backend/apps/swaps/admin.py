from django.contrib import admin

from apps.swaps.models import MatchSuggestion, SkillSwapRequest, SkillSwapStatusHistory


@admin.register(MatchSuggestion)
class MatchSuggestionAdmin(admin.ModelAdmin):
    list_display = ("source_user", "target_user", "suggestion_type", "score", "updated_at")
    list_filter = ("suggestion_type",)
    search_fields = ("source_user__email", "target_user__email", "rationale")
    readonly_fields = ("created_at", "updated_at")


@admin.register(SkillSwapRequest)
class SkillSwapRequestAdmin(admin.ModelAdmin):
    list_display = ("requester", "recipient", "status", "created_at", "updated_at")
    list_filter = ("status",)
    search_fields = ("requester__email", "recipient__email", "message")
    readonly_fields = ("created_at", "updated_at", "responded_at")


@admin.register(SkillSwapStatusHistory)
class SkillSwapStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("swap_request", "from_status", "to_status", "changed_by", "created_at")
    list_filter = ("to_status",)
    search_fields = ("swap_request__requester__email", "swap_request__recipient__email", "note")
    readonly_fields = ("created_at",)
