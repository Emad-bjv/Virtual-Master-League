import sys
from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from teams.models import Team, Player
from transfers.models import TransferHistory, TransferLog, TransferOffer


def run_sync_pes_transfers():
    """
    Synchronizes and repairs PES transfer status, missing TransferHistory records,
    orphaned player pointers, and unapplied status for all recent transfers.
    """
    stats = {
        'relinked_transfers': 0,
        'created_histories': 0,
        'synced_player_teams': 0,
        'pending_transfers_marked': 0,
    }

    with transaction.atomic():
        # 1. Re-link known orphan TransferHistory records if needed
        th1 = TransferHistory.objects.filter(id=1, seller_team__name__icontains='Milan').first()
        if th1:
            gabbia = Player.objects.filter(name__icontains='Gabbia').first()
            if gabbia and th1.player_id != gabbia.id:
                th1.player = gabbia
                th1.save(update_fields=['player'])
                stats['relinked_transfers'] += 1

        th2 = TransferHistory.objects.filter(id=2, seller_team__name__icontains='Milan').first()
        if th2:
            leao = Player.objects.filter(name__icontains='Leão').first() or Player.objects.filter(name__icontains='Leao').first()
            if leao and th2.player_id != leao.id:
                th2.player = leao
                th2.save(update_fields=['player'])
                stats['relinked_transfers'] += 1

        for th in TransferHistory.objects.filter(player__isnull=True):
            matched_player = None
            time_window = timedelta(minutes=5)
            if th.transferred_at:
                related_logs = TransferLog.objects.filter(
                    timestamp__gte=th.transferred_at - time_window,
                    timestamp__lte=th.transferred_at + time_window
                )
            else:
                related_logs = TransferLog.objects.all()

            for l in related_logs:
                desc = l.description or ''
                for p in Player.objects.all():
                    if p.name in desc:
                        matched_player = p
                        break
                if matched_player:
                    break

            if matched_player:
                th.player = matched_player
                th.save(update_fields=['player'])
                stats['relinked_transfers'] += 1

        # 2. Check accepted TransferOffers and guarantee TransferHistory for target & swap players
        accepted_offers = TransferOffer.objects.filter(status='ACCEPTED').select_related(
            'sender_team', 'receiver_team', 'target_player'
        )
        for off in accepted_offers:
            buyer = off.sender_team
            seller = off.receiver_team
            tp = off.target_player
            if tp:
                th_exists = TransferHistory.objects.filter(player=tp, buyer_team=buyer, seller_team=seller).exists()
                if not th_exists:
                    TransferHistory.objects.create(
                        player=tp,
                        seller_team=seller,
                        buyer_team=buyer,
                        price_usd=off.cash_amount,
                        transfer_type=off.offer_type
                    )
                    stats['created_histories'] += 1
                if tp.team != buyer:
                    tp.team = buyer
                    stats['synced_player_teams'] += 1
                if tp.pes_transfer_applied:
                    tp.pes_transfer_applied = False
                    tp.save()
                    stats['pending_transfers_marked'] += 1

            for sp in off.swap_players.all():
                sp_seller = buyer
                sp_buyer = seller
                sp_th_exists = TransferHistory.objects.filter(player=sp, buyer_team=sp_buyer, seller_team=sp_seller).exists()
                if not sp_th_exists:
                    TransferHistory.objects.create(
                        player=sp,
                        seller_team=sp_seller,
                        buyer_team=sp_buyer,
                        price_usd=Decimal('0.00'),
                        transfer_type='SWAP'
                    )
                    stats['created_histories'] += 1
                if sp.team != sp_buyer:
                    sp.team = sp_buyer
                    stats['synced_player_teams'] += 1
                if sp.pes_transfer_applied:
                    sp.pes_transfer_applied = False
                    sp.save()
                    stats['pending_transfers_marked'] += 1

        # 3. Known key league transfers that occurred via scripts without TransferHistory:
        # 3.1. Rafael Leão -> Chelsea (from AC Milan)
        leao = Player.objects.filter(name__icontains='Leão').first() or Player.objects.filter(name__icontains='Leao').first()
        chelsea = Team.objects.filter(name__icontains='Chelsea').first()
        ac_milan = Team.objects.filter(name__icontains='AC Milan').first()
        if leao and chelsea and leao.team == chelsea:
            if not TransferHistory.objects.filter(player=leao, buyer_team=chelsea).exists():
                TransferHistory.objects.create(
                    player=leao,
                    seller_team=ac_milan,
                    buyer_team=chelsea,
                    price_usd=Decimal('100000000.00'),
                    transfer_type='PERMANENT'
                )
                stats['created_histories'] += 1
            if leao.pes_transfer_applied:
                leao.pes_transfer_applied = False
                leao.save(update_fields=['pes_transfer_applied'])
                stats['pending_transfers_marked'] += 1

        # 3.2. Khvicha Kvaratskhelia -> PSG (from Napoli)
        kvara = Player.objects.filter(name__icontains='Kvaratskhelia', team__name__icontains='Paris').first()
        psg = Team.objects.filter(name__icontains='Paris').first()
        napoli = Team.objects.filter(name__icontains='Napoli').first()
        if kvara and psg and kvara.team == psg:
            if not TransferHistory.objects.filter(player=kvara, buyer_team=psg).exists():
                TransferHistory.objects.create(
                    player=kvara,
                    seller_team=napoli,
                    buyer_team=psg,
                    price_usd=Decimal('90000000.00'),
                    transfer_type='PERMANENT'
                )
                stats['created_histories'] += 1
            if kvara.pes_transfer_applied:
                kvara.pes_transfer_applied = False
                kvara.save(update_fields=['pes_transfer_applied'])
                stats['pending_transfers_marked'] += 1

        # 3.3. Alexis Saelemaekers -> AC Milan (from Arsenal)
        saele = Player.objects.filter(name__icontains='Saelemaekers').order_by('-id').first()
        if saele:
            if ac_milan and saele.team != ac_milan:
                saele.team = ac_milan
                saele.save(update_fields=['team'])
                stats['synced_player_teams'] += 1
            if saele.pes_transfer_applied:
                saele.pes_transfer_applied = False
                saele.save(update_fields=['pes_transfer_applied'])
                stats['pending_transfers_marked'] += 1

        # 4. Check all TransferHistory records with buyer_team
        # Ensure any player who was bought in TransferHistory has pes_transfer_applied=False
        # if this transfer is unapplied
        latest_histories = TransferHistory.objects.filter(buyer_team__isnull=False).select_related('player', 'buyer_team').order_by('-transferred_at')
        seen_players = set()
        for th in latest_histories:
            if not th.player_id or th.player_id in seen_players:
                continue
            seen_players.add(th.player_id)
            p = th.player
            if p and p.team_id == th.buyer_team_id:
                if p.pes_transfer_applied:
                    p.pes_transfer_applied = False
                    p.save(update_fields=['pes_transfer_applied'])
                    stats['pending_transfers_marked'] += 1

    return stats


class Command(BaseCommand):
    help = 'Synchronizes and repairs PES transfer status, missing TransferHistory records, and unapplied pending flags.'

    def handle(self, *args, **options):
        stats = run_sync_pes_transfers()
        self.stdout.write(self.style.SUCCESS(
            f"Successfully synced PES transfer status!\n"
            f"  Re-linked orphan transfer histories: {stats['relinked_transfers']}\n"
            f"  Created missing transfer histories: {stats['created_histories']}\n"
            f"  Synchronized player teams: {stats['synced_player_teams']}\n"
            f"  Marked pending transfers in PES: {stats['pending_transfers_marked']}"
        ))
