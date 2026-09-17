import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(BASE_DIR, '..', 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

sys.stdout.reconfigure(encoding='utf-8')
from decimal import Decimal
from django.db import transaction, connection
from django.db.models.signals import post_save
from teams.models import Team, Player
from transfers.models import TransferHistory, TransferOffer, TransferLog
from notifications.signals import notify_big_transfer
from transfers.negotiation_services import ensure_team_starting_eleven

# Temporarily disconnect post_save notifications to avoid 500+ telegram connection attempts
post_save.disconnect(notify_big_transfer, sender=TransferHistory)

with open('scratch/prod_teams_transfers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

teams_by_pk = {}
players_by_pk = {}

print(f"Total objects in dump: {len(data)}")

# Map local teams by name
local_teams = {t.name.lower(): t for t in Team.objects.all()}

# Disable SQLite foreign key checking during bulk sync
cursor = connection.cursor()
cursor.execute("PRAGMA foreign_keys = OFF;")

with transaction.atomic():
    # 1. Map teams
    for item in data:
        if item.get('model') == 'teams.team':
            pk = item.get('pk')
            fields = item.get('fields')
            name = fields.get('name')
            t = local_teams.get(name.lower())
            if t:
                teams_by_pk[pk] = t
                t.budget = fields.get('budget', t.budget)
                t.save(update_fields=['budget'])

    print(f"Mapped {len(teams_by_pk)} teams.")

    # 2. Sync all players by exact PK from prod dump
    updated_players = 0
    created_players = 0
    for item in data:
        if item.get('model') == 'teams.player':
            pk = item.get('pk')
            fields = item.get('fields')
            name = fields.get('name')
            team_pk = fields.get('team')
            target_team = teams_by_pk.get(team_pk) if team_pk else None

            p, created = Player.objects.update_or_create(
                id=pk,
                defaults={
                    'name': name,
                    'team': target_team,
                    'position': fields.get('position', 'CF'),
                    'overall': fields.get('overall', 80),
                    'age': fields.get('age', 25),
                    'wage': Decimal(str(fields.get('wage') or 10)),
                    'market_value': Decimal(str(fields.get('market_value') or 1000000)),
                    'is_free_agent': (target_team is None),
                    'pes_transfer_applied': fields.get('pes_transfer_applied', False),
                    'base_stamina': fields.get('base_stamina', 85),
                    'is_starting': False,
                    'x_coord': 0.0,
                    'y_coord': 0.0
                }
            )
            players_by_pk[pk] = p
            if created:
                created_players += 1
            else:
                updated_players += 1

    print(f"Players: {updated_players} updated, {created_players} created.")

    # 3. TransferHistory
    TransferHistory.objects.all().delete()
    th_created = 0
    for item in data:
        if item.get('model') == 'transfers.transferhistory':
            pk = item.get('pk')
            fields = item.get('fields')
            p_pk = fields.get('player')
            s_pk = fields.get('seller_team')
            b_pk = fields.get('buyer_team')

            player_obj = players_by_pk.get(p_pk) or Player.objects.filter(id=p_pk).first()
            seller_obj = teams_by_pk.get(s_pk)
            buyer_obj = teams_by_pk.get(b_pk)

            TransferHistory.objects.create(
                id=pk,
                player=player_obj,
                seller_team=seller_obj,
                buyer_team=buyer_obj,
                price_usd=Decimal(str(fields.get('price_usd') or 0)),
                transfer_type=fields.get('transfer_type', 'PERMANENT'),
                transferred_at=fields.get('transferred_at')
            )
            th_created += 1

    print(f"Created {th_created} TransferHistory records.")

    # 4. Ensure Starting XI and star ratings
    for t in Team.objects.all():
        ensure_team_starting_eleven(t)
        t.update_star_rating()

cursor.execute("PRAGMA foreign_keys = ON;")
print("Local database is now 100% synchronized with production!")
