from django.urls import path

from apps.opportunities.admin_views import (
    AdminOpportunityModerationDecisionView,
    AdminOpportunityModerationListView,
)

urlpatterns = [
    path("jobs/", AdminOpportunityModerationListView.as_view(), name="admin-job-list"),
    path("jobs/<int:pk>/decision/", AdminOpportunityModerationDecisionView.as_view(), name="admin-job-decision"),
]
