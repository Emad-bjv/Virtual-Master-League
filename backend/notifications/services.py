import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_telegram_message(text: str):
    """
    Sends a message to the configured Telegram chat/channel.
    Catches exceptions so the main thread doesn't crash on network failure.
    """
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', None)

    if not token or not chat_id:
        logger.warning("Telegram Bot Token or Chat ID is not configured.")
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
