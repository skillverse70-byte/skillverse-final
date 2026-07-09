from django.urls import path

from apps.communities.views import (
    CommunityGroupDetailView,
    CommunityGroupListCreateView,
    CommunityMembershipActionView,
    CommunityPostListCreateView,
)

urlpatterns = [
    path("communities/", CommunityGroupListCreateView.as_view(), name="community-group-list"),
    path("communities/<int:pk>/", CommunityGroupDetailView.as_view(), name="community-group-detail"),
    path(
        "communities/<int:pk>/membership/",
        CommunityMembershipActionView.as_view(),
        name="community-group-membership-action",
    ),
    path(
        "communities/<int:pk>/posts/",
        CommunityPostListCreateView.as_view(),
        name="community-group-posts",
    ),
]
