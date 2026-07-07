from django.urls import path

from apps.notifications.views import (
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    NotificationSummaryView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("summary/", NotificationSummaryView.as_view(), name="notification-summary"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("<int:pk>/read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
]

