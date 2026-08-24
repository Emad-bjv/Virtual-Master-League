from django.db.models.signals import post_save
from django.dispatch import receiver
from matches.models import Match
from transfers.models import TransferHistory
from gacha.models import PackOpeningSession
from .services import send_telegram_message, create_notification

@receiver(post_save, sender=Match)
def notify_match_finished(sender, instance, created, **kwargs):
    if not created and getattr(instance, 'status', None) == 'FINISHED':
        home_team = instance.home_team.name if instance.home_team else "TBD"
        away_team = instance.away_team.name if instance.away_team else "TBD"

        title = "🏆 پایان بازی"
        message = f"⚽️ {home_team}  {instance.home_score} - {instance.away_score}  {away_team}\nمرحله: {instance.round_name if instance.round_name else 'لیگ'}"

        text = f"{title}\n\n{message}"
        send_telegram_message(text)

        # In-app notifications for both participating teams
        if instance.home_team:
            create_notification(team=instance.home_team, category='MATCH', title=title, message=message)
        if instance.away_team:
            create_notification(team=instance.away_team, category='MATCH', title=title, message=message)


@receiver(post_save, sender=TransferHistory)
def notify_big_transfer(sender, instance, created, **kwargs):
    if created and instance.price_usd >= 500: # Threshold for big transfers
        seller = instance.seller_team.name if instance.seller_team else "Free Agent"
        buyer = instance.buyer_team.name if instance.buyer_team else "Released"
        player = instance.player.name if instance.player else "Unknown Player"

        title = "🚨 نقل و انتقال بزرگ (بمب بازار)"
        message = f"👤 بازیکن: {player}\n💰 مبلغ معامله: {instance.price_usd} دلار\n🤝 از {seller} به {buyer}"

        send_telegram_message(f"{title}\n\n{message}")

        # In-app notifications for both involved teams
        if instance.seller_team:
            create_notification(team=instance.seller_team, category='TRANSFER', title=title, message=message)
        if instance.buyer_team:
            create_notification(team=instance.buyer_team, category='TRANSFER', title=title, message=message)


@receiver(post_save, sender=PackOpeningSession)
def notify_legendary_pull(sender, instance, created, **kwargs):
    if not created and instance.status == 'COMPLETED' and instance.picked_card:
        if instance.picked_card.overall >= 87 or instance.pack.tier == 'LEGENDARY' or instance.picked_card.rarity == 'LEGENDARY':
            team = instance.team.name
            player = instance.picked_card.name

            title = "🌟 استخراج لجندری!"
            message = f"تیم {team} توانست از طریق پک «{instance.pack.name}» بازیکن درخشان «{player}» را جذب کند!\n🔥 تبریک به مربی!"

            send_telegram_message(f"{title}\n\n{message}")

            if instance.team:
                create_notification(team=instance.team, category='GACHA', title=title, message=message)
