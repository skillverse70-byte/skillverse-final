from django.urls import re_path

from apps.messaging.consumers import MessageThreadConsumer

websocket_urlpatterns = [
    re_path(
        r"^ws/messages/threads/(?P<thread_id>\d+)/$",
        MessageThreadConsumer.as_asgi(),
    ),
]
