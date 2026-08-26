from django.core.management.base import BaseCommand
from transfers.models import TransferHistory, TransferLog, TransferOffer


class Command(BaseCommand):
    help = 'Retroactively synchronize TransferHistory entries to TransferLog so no historical transfer is missed.'

    def handle(self, *args, **options):
        histories = TransferHistory.objects.select_related('player', 'seller_team', 'buyer_team').order_by('transferred_at')
        created_count = 0

        for h in histories:
            if not h.player:
                continue

            p_name = h.player.name
            s_name = h.seller_team.name if h.seller_team else "بازیکن آزاد"
            b_name = h.buyer_team.name if h.buyer_team else "لیست بازیکنان آزاد"
            price_val = float(h.price_usd or 0)
            price_str = f"${price_val:,.0f}"

            # Check if an existing log exists for this player
            exists = TransferLog.objects.filter(
                description__icontains=p_name
            ).exists()

            if not exists:
                tt = (h.transfer_type or '').upper()
                if tt in ['RELEASE', 'AUTO_RELEASE']:
                    event_type = 'PLAYER_RELEASED'
                    desc = f"تیم {s_name} قرارداد بازیکن «{p_name}» را فسخ کرد و {price_str} به عنوان بازگشت مالی دریافت نمود."
                elif tt == 'FREE_AGENT':
                    event_type = 'FREE_AGENT_SIGNED'
                    desc = f"باشگاه {b_name} بازیکن آزاد «{p_name}» را با ارزش {price_str} به ترکیب خود اضافه کرد."
                elif tt == 'SWAP':
                    event_type = 'TRANSFER_FINALIZED'
                    desc = f"معاوضه رسمی: بازیکن «{p_name}» از تیم {s_name} به تیم {b_name} پیوست."
                elif tt == 'LOAN':
                    event_type = 'TRANSFER_FINALIZED'
                    desc = f"انتقال قرضی: بازیکن «{p_name}» با مبلغ {price_str} از تیم {s_name} به تیم {b_name} منتقل شد."
                else:
                    event_type = 'TRANSFER_FINALIZED'
                    desc = f"انتقال رسمی: بازیکن «{p_name}» با مبلغ {price_str} از تیم {s_name} به تیم {b_name} واگذار گردید."

                matching_offer = TransferOffer.objects.filter(
                    target_player=h.player,
                    status='ACCEPTED'
                ).first()

                TransferLog.objects.create(
                    event_type=event_type,
                    description=desc,
                    related_offer=matching_offer,
                    timestamp=h.transferred_at
                )
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully synchronized {created_count} missing transfer log(s).'))
