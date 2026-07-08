from django.urls import path

from apps.ai.views import AdminAIProviderHealthView

urlpatterns = [
    path(
        "provider-health/",
        AdminAIProviderHealthView.as_view(),
        name="admin-ai-provider-health",
    ),
]
