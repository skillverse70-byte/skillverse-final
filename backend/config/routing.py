from apps.messaging.routing import websocket_urlpatterns as messaging_websocket_urlpatterns

websocket_urlpatterns = [
    *messaging_websocket_urlpatterns,
]
