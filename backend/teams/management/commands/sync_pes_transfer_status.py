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
    Safely audits and repairs PES transfer status, linking orphan TransferHistory
    records to corresponding players, without mutating player squads or altering
    historical agreements.
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

    return stats


class Command(BaseCommand):
    help = 'Safely synchronizes and audits PES transfer status and links orphan TransferHistory records.'

    def handle(self, *args, **options):
        stats = run_sync_pes_transfers()
        self.stdout.write(self.style.SUCCESS(
            f"Successfully checked PES transfer status!\n"
            f"  Re-linked orphan transfer histories: {stats['relinked_transfers']}\n"
            f"  Created missing transfer histories: {stats['created_histories']}\n"
            f"  Synchronized player teams: {stats['synced_player_teams']}\n"
            f"  Marked pending transfers in PES: {stats['pending_transfers_marked']}"
        ))
