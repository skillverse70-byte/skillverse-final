from django.urls import path

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
]
