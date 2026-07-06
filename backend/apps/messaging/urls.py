from django.urls import path

from apps.messaging.views import (
    MessageThreadDetailView,
    MessageThreadListCreateView,
    ThreadMessageListCreateView,
)

urlpatterns = [
    path("threads/", MessageThreadListCreateView.as_view(), name="message-threads"),
    path("threads/<int:pk>/", MessageThreadDetailView.as_view(), name="message-thread-detail"),
    path(
        "threads/<int:thread_id>/messages/",
        ThreadMessageListCreateView.as_view(),
        name="thread-messages",
    ),
]
