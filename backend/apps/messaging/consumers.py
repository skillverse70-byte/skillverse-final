from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.messaging.services import (
    get_message_thread_for_user,
    get_thread_group_name,
    get_unread_summary_for_user,
    get_user_inbox_group_name,
)


class MessageThreadConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.thread_id = int(self.scope["url_route"]["kwargs"]["thread_id"])
        self.user = self.scope.get("user")

        if not getattr(self.user, "is_authenticated", False):
            await self.close(code=4401)
            return

        thread = await self.get_thread_for_user()
        if thread is None:
            await self.close(code=4403)
            return

        self.thread_group_name = get_thread_group_name(self.thread_id)
        await self.channel_layer.group_add(self.thread_group_name, self.channel_name)
        await self.accept()
        await self.send_json(
            {
                "type": "connection.ready",
                "thread_id": self.thread_id,
            }
        )

    async def disconnect(self, close_code):
        thread_group_name = getattr(self, "thread_group_name", "")
        if thread_group_name:
            await self.channel_layer.group_discard(thread_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "heartbeat":
            await self.send_json({"type": "heartbeat", "thread_id": self.thread_id})

    async def thread_message_created(self, event):
        await self.send_json(
            {
                "type": "thread.message.created",
                "thread_id": event["thread_id"],
                "message": event["message"],
            }
        )

    @database_sync_to_async
    def get_thread_for_user(self):
        return get_message_thread_for_user(user=self.user, thread_id=self.thread_id)


class MessageInboxConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")

        if not getattr(self.user, "is_authenticated", False):
            await self.close(code=4401)
            return

        self.inbox_group_name = get_user_inbox_group_name(self.user.id)
        await self.channel_layer.group_add(self.inbox_group_name, self.channel_name)
        await self.accept()
        await self.send_json(
            {
                "type": "connection.ready",
                "summary": await self.get_unread_summary(),
            }
        )

    async def disconnect(self, close_code):
        inbox_group_name = getattr(self, "inbox_group_name", "")
        if inbox_group_name:
            await self.channel_layer.group_discard(inbox_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "heartbeat":
            await self.send_json({"type": "heartbeat"})

    async def messages_unread_updated(self, event):
        await self.send_json(
            {
                "type": "messages.unread.updated",
                "summary": event["summary"],
            }
        )

    @database_sync_to_async
    def get_unread_summary(self):
        return get_unread_summary_for_user(self.user)
