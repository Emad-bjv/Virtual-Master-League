import json
from channels.generic.websocket import AsyncWebsocketConsumer

class AdminChannelConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if user.is_anonymous or user.role != 'admin':
            await self.close()
            return
            
        self.group_name = "admin_broadcast"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def admin_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))


class MatchLiveConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.match_id = self.scope['url_route']['kwargs']['match_id']
        self.group_name = f"match_{self.match_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def match_event(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))
