from django.urls import path

from apps.ai.views import (
    AIAdaptiveMonitoringCheckInView,
    AIAdaptiveMonitoringStateView,
    AICognitiveMonitoringConsentRevokeView,
    AICognitiveMonitoringConsentView,
    AICapabilitySnapshotView,
    AILearningGuidanceView,
    AIRecommendationFeedView,
)

urlpatterns = [
    path("capabilities/", AICapabilitySnapshotView.as_view(), name="ai-capability-snapshot"),
    path(
        "cognitive-monitoring/consent/",
        AICognitiveMonitoringConsentView.as_view(),
        name="ai-cognitive-monitoring-consent",
    ),
    path(
        "cognitive-monitoring/consent/revoke/",
        AICognitiveMonitoringConsentRevokeView.as_view(),
        name="ai-cognitive-monitoring-consent-revoke",
    ),
    path(
        "cognitive-monitoring/adaptive-state/",
        AIAdaptiveMonitoringStateView.as_view(),
        name="ai-adaptive-monitoring-state",
    ),
    path(
        "cognitive-monitoring/check-in/",
        AIAdaptiveMonitoringCheckInView.as_view(),
        name="ai-adaptive-monitoring-check-in",
    ),
    path("learning-guidance/", AILearningGuidanceView.as_view(), name="ai-learning-guidance"),
    path("recommendations/", AIRecommendationFeedView.as_view(), name="ai-recommendation-feed"),
]
