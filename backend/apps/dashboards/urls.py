from django.urls import path

from apps.dashboards.views import (
    AdminAnalyticsView,
    AdminDashboardView,
    OrganizationAnalyticsView,
    OrganizationDashboardView,
    RegularUserDashboardView,
)

urlpatterns = [
    path("dashboard/me/", RegularUserDashboardView.as_view(), name="dashboard-regular"),
    path(
        "dashboard/organization/",
        OrganizationDashboardView.as_view(),
        name="dashboard-organization",
    ),
    path(
        "dashboard/organization/analytics/",
        OrganizationAnalyticsView.as_view(),
        name="dashboard-organization-analytics",
    ),
    path("dashboard/admin/", AdminDashboardView.as_view(), name="dashboard-admin"),
    path(
        "dashboard/admin/analytics/",
        AdminAnalyticsView.as_view(),
        name="dashboard-admin-analytics",
    ),
]
