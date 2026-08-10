from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import AdminNotification

def notify_admin(message_data):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
        
    AdminNotification.objects.create(message=message_data)
    
    async_to_sync(channel_layer.group_send)(
        "admin_broadcast",
        {
            "type": "admin_message",
            "message": message_data
        }
    )

def broadcast_match_event(match_id, event_data):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    
    async_to_sync(channel_layer.group_send)(
        f"match_{match_id}",
        {
            "type": "match_event",
            "message": event_data
        }
    )
