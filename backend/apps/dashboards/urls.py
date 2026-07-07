from django.urls import path

from apps.dashboards.views import (
    AdminDashboardView,
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
    path("dashboard/admin/", AdminDashboardView.as_view(), name="dashboard-admin"),
]

