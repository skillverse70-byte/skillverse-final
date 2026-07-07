from django.urls import path

from apps.accounts.admin_views import (
    AdminUserModerationDecisionView,
    AdminUserModerationListView,
)

urlpatterns = [
    path("users/", AdminUserModerationListView.as_view(), name="admin-user-list"),
    path("users/<int:pk>/decision/", AdminUserModerationDecisionView.as_view(), name="admin-user-decision"),
]
