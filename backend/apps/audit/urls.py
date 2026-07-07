from django.urls import path

from apps.audit.views import AdminAuditLogDetailView, AdminAuditLogListView

urlpatterns = [
    path("logs/", AdminAuditLogListView.as_view(), name="admin-audit-log-list"),
    path("logs/<int:pk>/", AdminAuditLogDetailView.as_view(), name="admin-audit-log-detail"),
]
