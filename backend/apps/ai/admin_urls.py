from django.urls import path

from apps.ai.views import (
    AdminAICognitiveMonitoringOverviewView,
    AdminAIProviderHealthView,
)

urlpatterns = [
    path(
        "provider-health/",
        AdminAIProviderHealthView.as_view(),
        name="admin-ai-provider-health",
    ),
    path(
        "cognitive-monitoring/overview/",
        AdminAICognitiveMonitoringOverviewView.as_view(),
        name="admin-ai-cognitive-monitoring-overview",
    ),
]
