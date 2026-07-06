from channels.generic.websocket import AsyncJsonWebsocketConsumer


class MessageThreadConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.thread_id = self.scope["url_route"]["kwargs"]["thread_id"]
        await self.accept()
        await self.send_json(
            {
                "type": "connection.ready",
                "thread_id": self.thread_id,
            }
        )

    async def disconnect(self, close_code):
        return None
