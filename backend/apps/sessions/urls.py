from django.urls import path

from apps.sessions.views import LearningSessionDetailView, LearningSessionListCreateView

urlpatterns = [
    path("", LearningSessionListCreateView.as_view(), name="learning-sessions"),
    path("<int:pk>/", LearningSessionDetailView.as_view(), name="learning-session-detail"),
]

