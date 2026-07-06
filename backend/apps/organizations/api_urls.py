from django.urls import path

from apps.organizations.views import (
    CurrentOrganizationProfileView,
    CurrentOrganizationVerificationView,
    OrganizationPublicProfileView,
    OrganizationVerificationSubmitView,
)

urlpatterns = [
    path("me/", CurrentOrganizationProfileView.as_view(), name="organization-me"),
    path("verification/me/", CurrentOrganizationVerificationView.as_view(), name="organization-verification-me"),
    path("verification/submit/", OrganizationVerificationSubmitView.as_view(), name="organization-verification-submit"),
    path("<int:pk>/public/", OrganizationPublicProfileView.as_view(), name="organization-public-profile"),
]
