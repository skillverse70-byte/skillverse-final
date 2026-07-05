from django.urls import path

from apps.organizations.views import (
    CurrentOrganizationProfileView,
    OrganizationPublicProfileView,
)

urlpatterns = [
    path("me/", CurrentOrganizationProfileView.as_view(), name="organization-me"),
    path("<int:pk>/public/", OrganizationPublicProfileView.as_view(), name="organization-public-profile"),
]
