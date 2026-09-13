from django.core.management.base import BaseCommand
from teams.models import Player, Team
from transfers.models import TransferHistory
from gacha.models import PackPlayer


class Command(BaseCommand):
    help = "Initializes pes_transfer_applied and nationality fields for existing players"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== Initializing PES Transfer Status ==="))
        all_players = Player.objects.all()
        transferred_count = 0
        base_players_count = 0
        updated_nationality_count = 0

        # Map player names to nationality from PackPlayer cards
        card_nats = {}
        for card in PackPlayer.objects.filter(nationality__isnull=False).exclude(nationality=''):
            c_name = card.name.strip().lower()
            if c_name not in card_nats:
                card_nats[c_name] = card.nationality.strip()

        # Set of player IDs that have transfer records
        transferred_player_ids = set(TransferHistory.objects.values_list('player_id', flat=True))

        for p in all_players:
            changed_fields = []

            # Populate nationality if missing
            if not p.nationality:
                p_name_lower = p.name.strip().lower()
                if p_name_lower in card_nats:
                    p.nationality = card_nats[p_name_lower]
                    changed_fields.append('nationality')
                    updated_nationality_count += 1

            # Determine if player has been transferred
            is_transferred = (p.id in transferred_player_ids) or (
                p.base_team_id and p.team_id and p.base_team_id != p.team_id
            )

            if not is_transferred:
                # Regular home squad player: mark as already applied in PES
                if not p.pes_transfer_applied:
                    p.pes_transfer_applied = True
                    changed_fields.append('pes_transfer_applied')
                    base_players_count += 1
            else:
                # Transferred player: needs PES review/application
                transferred_count += 1

            if changed_fields:
                p.save(update_fields=changed_fields)

        self.stdout.write(self.style.SUCCESS(
            f"Successfully updated:\n"
            f"  - Total players: {all_players.count()}\n"
            f"  - Base players marked as applied: {base_players_count}\n"
            f"  - Transferred players pending PES application: {transferred_count}\n"
            f"  - Nationalities populated: {updated_nationality_count}"
        ))
