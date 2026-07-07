from django.urls import path

from apps.opportunities.views import (
    OpportunityDetailView,
    OpportunityListView,
    OrganizationApplicationDetailView,
    OrganizationApplicationListView,
    OrganizationOpportunityDetailView,
    OrganizationOpportunityListCreateView,
    RegularUserApplicationCreateView,
    RegularUserApplicationListView,
)

urlpatterns = [
    path("jobs/", OpportunityListView.as_view(), name="job-list"),
    path("jobs/<int:pk>/", OpportunityDetailView.as_view(), name="job-detail"),
    path("jobs/manage/", OrganizationOpportunityListCreateView.as_view(), name="job-manage-list-create"),
    path("jobs/manage/<int:pk>/", OrganizationOpportunityDetailView.as_view(), name="job-manage-detail"),
    path("jobs/applications/", RegularUserApplicationListView.as_view(), name="job-application-list"),
    path("jobs/<int:pk>/apply/", RegularUserApplicationCreateView.as_view(), name="job-apply"),
    path("jobs/manage/applications/", OrganizationApplicationListView.as_view(), name="job-manage-application-list"),
    path("jobs/manage/applications/<int:pk>/", OrganizationApplicationDetailView.as_view(), name="job-manage-application-detail"),
]
