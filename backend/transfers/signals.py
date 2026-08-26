from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import TransferHistory, TransferLog, TransferOffer


@receiver(post_save, sender=TransferHistory)
def log_transfer_history_fallback(sender, instance, created, **kwargs):
    """
    Guarantees that every single transfer recorded in TransferHistory
    has a corresponding TransferLog entry so no transaction is ever missed in the newsroom.
    """
    if not created:
        return

    p_name = instance.player.name if instance.player else "بازیکن"
    s_name = instance.seller_team.name if instance.seller_team else "بازیکن آزاد"
    b_name = instance.buyer_team.name if instance.buyer_team else "لیست بازیکنان آزاد"
    price_val = float(instance.price_usd or 0)
    price_str = f"${price_val:,.0f}"

    # Check if a log was already created for this transfer within the last 60 seconds
    from django.utils import timezone
    from datetime import timedelta
    recent_threshold = timezone.now() - timedelta(seconds=60)

    # Check if there is already a recent log mentioning this player
    existing_log = TransferLog.objects.filter(
        timestamp__gte=recent_threshold,
        description__icontains=p_name
    ).exists()

    if existing_log:
        return

    # Determine event type and rich description based on transfer_type
    tt = (instance.transfer_type or '').upper()
    if tt in ['RELEASE', 'AUTO_RELEASE']:
        event_type = 'PLAYER_RELEASED'
        desc = f"تیم {s_name} قرارداد بازیکن «{p_name}» را فسخ کرد و {price_str} به عنوان غرامت/بازگشت مالی به حساب باشگاه منظور شد."
    elif tt == 'FREE_AGENT':
        event_type = 'FREE_AGENT_SIGNED'
        desc = f"باشگاه {b_name} بازیکن آزاد «{p_name}» را با ارزش {price_str} به خدمت گرفت."
    elif tt == 'SWAP':
        event_type = 'TRANSFER_FINALIZED'
        desc = f"معاوضه رسمی: بازیکن «{p_name}» از تیم {s_name} به تیم {b_name} منتقل گردید."
    elif tt == 'LOAN':
        event_type = 'TRANSFER_FINALIZED'
        desc = f"انتقال قرضی: بازیکن «{p_name}» با مبلغ {price_str} از تیم {s_name} به تیم {b_name} پیوست."
    elif tt == 'AUCTION':
        event_type = 'TRANSFER_FINALIZED'
        desc = f"پیروزی در مزایده: بازیکن «{p_name}» با مبلغ نهایی {price_str} توسط تیم {b_name} از تیم {s_name} خریداری شد."
    else:
        # FIXED_PRICE or DIRECT_TRANSFER
        event_type = 'TRANSFER_FINALIZED'
        desc = f"انتقال قطعی: بازیکن «{p_name}» با مبلغ {price_str} از تیم {s_name} به تیم {b_name} واگذار گردید."

    # Try to find a matching recent accepted offer if available
    matching_offer = TransferOffer.objects.filter(
        target_player=instance.player,
        status='ACCEPTED',
        updated_at__gte=recent_threshold
    ).first() if instance.player else None

    TransferLog.objects.create(
        event_type=event_type,
        description=desc,
        related_offer=matching_offer
    )
