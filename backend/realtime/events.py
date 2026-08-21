import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import AdminNotification

logger = logging.getLogger(__name__)

def notify_admin(message_data):
    try:
        channel_layer = get_channel_layer()
        AdminNotification.objects.create(message=message_data)
        if not channel_layer:
            return
            
        async_to_sync(channel_layer.group_send)(
            "admin_broadcast",
            {
                "type": "admin_message",
                "message": message_data
            }
        )
    except Exception as e:
        logger.warning(f"WebSocket notify_admin broadcast failed: {e}")

def broadcast_match_event(match_id, event_data):
    try:
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
    except Exception as e:
        logger.warning(f"WebSocket broadcast_match_event failed for match {match_id}: {e}")
