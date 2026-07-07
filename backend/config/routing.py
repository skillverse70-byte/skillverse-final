from apps.messaging.routing import websocket_urlpatterns as messaging_websocket_urlpatterns
from apps.notifications.routing import websocket_urlpatterns as notifications_websocket_urlpatterns

websocket_urlpatterns = [
    *messaging_websocket_urlpatterns,
    *notifications_websocket_urlpatterns,
]
