from django.urls import path

from apps.events.views import AdminEventOversightDecisionView, AdminEventOversightListView

urlpatterns = [
    path("events/", AdminEventOversightListView.as_view(), name="admin-event-list"),
    path("events/<int:pk>/decision/", AdminEventOversightDecisionView.as_view(), name="admin-event-decision"),
]
