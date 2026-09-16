import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def connect_news_signals():
    """Connects signals safely to avoid early import crashes before apps are loaded."""
    try:
        from matches.models import Match
        from transfers.models import TransferHistory, TransferOffer
        from teams.models import ClubPenalty
        from news.news_engine import (
            generate_match_news,
            generate_transfer_news,
            generate_disciplinary_news
        )

        @receiver(post_save, sender=Match)
        def on_match_saved(sender, instance, **kwargs):
            if instance.status == 'FINISHED':
                # Skip suspended tournaments (e.g. League or Cup with is_active=False)
                if instance.tournament and not instance.tournament.is_active:
                    return
                try:
                    generate_match_news(instance)
                except Exception as e:
                    logger.warning(f"Failed to auto-generate match news for match #{instance.id}: {e}")

        @receiver(post_save, sender=TransferHistory)
        def on_transfer_history_saved(sender, instance, **kwargs):
            try:
                generate_transfer_news(instance, is_history=True)
            except Exception as e:
                logger.warning(f"Failed to auto-generate transfer news for history #{instance.id}: {e}")

        @receiver(post_save, sender=TransferOffer)
        def on_transfer_offer_saved(sender, instance, **kwargs):
            if instance.status == 'ACCEPTED':
                try:
                    generate_transfer_news(instance, is_history=False)
                except Exception as e:
                    logger.warning(f"Failed to auto-generate transfer offer news for offer #{instance.id}: {e}")

        @receiver(post_save, sender=ClubPenalty)
        def on_disciplinary_saved(sender, instance, **kwargs):
            if instance.publish_to_newsroom:
                try:
                    generate_disciplinary_news(instance)
                except Exception as e:
                    logger.warning(f"Failed to auto-generate disciplinary news for penalty #{instance.id}: {e}")

    except Exception as e:
        logger.warning(f"Error connecting newsroom signals: {e}")


connect_news_signals()
