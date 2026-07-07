from django.urls import path

from apps.organizations.admin_views import (
    AdminOrganizationModerationDecisionView,
    AdminOrganizationModerationListView,
)
from apps.organizations.views import (
    AdminOrganizationVerificationDecisionView,
    AdminOrganizationVerificationRequestListView,
)

urlpatterns = [
    path(
        "verification-requests/",
        AdminOrganizationVerificationRequestListView.as_view(),
        name="admin-organization-verification-request-list",
    ),
    path(
        "verification-requests/<int:pk>/decision/",
        AdminOrganizationVerificationDecisionView.as_view(),
        name="admin-organization-verification-request-decision",
    ),
    path(
        "moderation/",
        AdminOrganizationModerationListView.as_view(),
        name="admin-organization-moderation-list",
    ),
    path(
        "moderation/<int:pk>/decision/",
        AdminOrganizationModerationDecisionView.as_view(),
        name="admin-organization-moderation-decision",
    ),
]
