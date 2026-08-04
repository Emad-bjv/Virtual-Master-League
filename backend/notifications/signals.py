from django.db.models.signals import post_save
from django.dispatch import receiver
from matches.models import Match
from transfers.models import TransferHistory
from gacha.models import PackOpeningLog
from .services import send_telegram_message

@receiver(post_save, sender=Match)
def notify_match_finished(sender, instance, created, **kwargs):
    if not created and getattr(instance, 'status', None) == 'FINISHED':
        home_team = instance.home_team.name if instance.home_team else "TBD"
        away_team = instance.away_team.name if instance.away_team else "TBD"
        
        text = (
            f"🏆 *پایان بازی*\n\n"
            f"⚽️ {home_team}  {instance.home_score} - {instance.away_score}  {away_team}\n"
            f"مرحله: {instance.round_name if instance.round_name else 'لیگ'}"
        )
        send_telegram_message(text)


@receiver(post_save, sender=TransferHistory)
def notify_big_transfer(sender, instance, created, **kwargs):
    if created and instance.price_usd >= 500: # Threshold for big transfers
        seller = instance.seller_team.name if instance.seller_team else "Free Agent"
        buyer = instance.buyer_team.name if instance.buyer_team else "Released"
        player = instance.player.name if instance.player else "Unknown Player"
        
        text = (
            f"🚨 *نقل و انتقال بزرگ (بمب بازار)*\n\n"
            f"👤 بازیکن: {player}\n"
            f"💰 مبلغ معامله: {instance.price_usd} دلار\n"
            f"🤝 از {seller} به {buyer}"
        )
        send_telegram_message(text)


@receiver(post_save, sender=PackOpeningLog)
def notify_legendary_pull(sender, instance, created, **kwargs):
    if created and instance.rarity_drawn == 'LEGENDARY':
        team = instance.team.name
        player = instance.player_obtained.name if instance.player_obtained else "Unknown"
        
        text = (
            f"🌟 *استخراج لجندری!*\n\n"
            f"تیم {team} توانست از طریق گاشا یک بازیکن افسانه‌ای جذب کند!\n"
            f"👤 بازیکن: {player}\n"
            f"🔥 تبریک به مربی!"
        )
        send_telegram_message(text)
