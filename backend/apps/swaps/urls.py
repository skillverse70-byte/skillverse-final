from django.urls import path

from apps.swaps.views import (
    MatchSuggestionListView,
    SkillSwapAcceptView,
    SkillSwapCancelView,
    SkillSwapRejectView,
    SkillSwapRequestDetailView,
    SkillSwapRequestListCreateView,
)

urlpatterns = [
    path("match-suggestions/", MatchSuggestionListView.as_view(), name="match-suggestions"),
    path("requests/", SkillSwapRequestListCreateView.as_view(), name="swap-requests"),
    path("requests/<int:pk>/", SkillSwapRequestDetailView.as_view(), name="swap-request-detail"),
    path("requests/<int:pk>/accept/", SkillSwapAcceptView.as_view(), name="swap-request-accept"),
    path("requests/<int:pk>/reject/", SkillSwapRejectView.as_view(), name="swap-request-reject"),
    path("requests/<int:pk>/cancel/", SkillSwapCancelView.as_view(), name="swap-request-cancel"),
]
