from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.notifications.services import (
    get_notification_group_name,
    get_notification_summary_for_user,
)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")

        if not getattr(self.user, "is_authenticated", False):
            await self.close(code=4401)
            return

        self.notification_group_name = get_notification_group_name(self.user.id)
        await self.channel_layer.group_add(self.notification_group_name, self.channel_name)
        await self.accept()
        await self.send_json(
            {
                "type": "connection.ready",
                "summary": await self.get_summary(),
            }
        )

    async def disconnect(self, close_code):
        group_name = getattr(self, "notification_group_name", "")
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "heartbeat":
            await self.send_json({"type": "heartbeat"})

    async def notification_created(self, event):
        await self.send_json(
            {
                "type": "notification.created",
                "notification": event["notification"],
                "summary": event["summary"],
            }
        )

    async def notifications_unread_updated(self, event):
        await self.send_json(
            {
                "type": "notifications.unread.updated",
                "summary": event["summary"],
            }
        )

    @database_sync_to_async
    def get_summary(self):
        return get_notification_summary_for_user(self.user)

