import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def create_notification(team=None, category='SYSTEM', title='', message=''):
    """
    Creates an in-app notification for a team inbox (or system-wide when team is None).
    Returns the created Notification instance (or None on failure).
    """
    try:
        from .models import Notification
        return Notification.objects.create(
            team=team,
            category=category,
            title=title,
            message=message,
        )
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        return None


def send_telegram_message(text: str):
    """
    Sends a message to the configured Telegram chat/channel.
    Catches exceptions so the main thread doesn't crash on network failure.
    """
    if not text or not str(text).strip():
        return False

    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)

    if not token or not chat_id or str(token).startswith('123456789') or token == 'UNCONFIGURED':
        logger.warning("Telegram Bot Token or Chat ID is not properly configured.")
        return False

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'Markdown'
    }

    try:
        response = requests.post(url, json=payload, timeout=5)
        response.raise_for_status()
        return True
    except Exception as e:
        logger.error(f"Failed to send telegram message: {e}")
        return False
