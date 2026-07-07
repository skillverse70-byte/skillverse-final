from django.urls import path

from apps.events.views import (
    EventDetailView,
    EventListView,
    OrganizationEventDetailView,
    OrganizationEventListCreateView,
    RegularUserRSVPListView,
    RegularUserRSVPView,
)

urlpatterns = [
    path("events/", EventListView.as_view(), name="event-list"),
    path("events/<int:pk>/", EventDetailView.as_view(), name="event-detail"),
    path("events/manage/", OrganizationEventListCreateView.as_view(), name="event-manage-list-create"),
    path("events/manage/<int:pk>/", OrganizationEventDetailView.as_view(), name="event-manage-detail"),
    path("events/rsvps/", RegularUserRSVPListView.as_view(), name="event-rsvp-list"),
    path("events/<int:pk>/rsvp/", RegularUserRSVPView.as_view(), name="event-rsvp"),
]
