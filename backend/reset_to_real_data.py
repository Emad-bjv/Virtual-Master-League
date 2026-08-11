import os
import sys
import json
import django
from decimal import Decimal

sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player, ClubFacilities
from users.models import User
from economy.models import StorePackage
from gacha.models import GachaPack
from transfers.models import TransferListing
from notifications.models import Notification
from matches.models import Match

FC26_TEAMS = [
    'AC Milan', 'Arsenal', 'Atlético Madrid', 'BVB Borussia Dortmund',
    'Chelsea', 'FC Barcelona', 'FC Bayern München', 'Inter',
    'Juventus', 'Liverpool', 'Manchester City', 'Manchester United',
    'Newcastle United', 'Paris Saint-Germain', 'Real Madrid', 'Tottenham Hotspur'
]

def reset_db():
    print("Starting clean reset to Real FC 26 data...")

    # 1. Clear transfer listings and notifications
    TransferListing.objects.all().delete()
    Notification.objects.all().delete()
    Match.objects.all().delete()
    print("Cleared transfer listings, notifications, and matches.")

    # 2. Delete non-FC26 teams and players
    dummy_teams = Team.objects.exclude(name__in=FC26_TEAMS)
    dummy_team_names = list(dummy_teams.values_list('name', flat=True))
    
    # Detach or delete dummy users
    dummy_users = User.objects.filter(team__name__in=dummy_team_names)
    print(f"Deleting {dummy_users.count()} test users...")
    dummy_users.delete()

    deleted_players, _ = Player.objects.filter(team__name__in=dummy_team_names).delete()
    deleted_teams, _ = dummy_teams.delete()
    print(f"Deleted {deleted_teams} dummy teams and {deleted_players} dummy players.")

    # 3. Load / import FC 26 teams and players from fixture JSON if not present
    fixture_path = os.path.join(os.path.dirname(__file__), 'teams', 'fixtures', 'fc26_players.json')
    if os.path.exists(fixture_path):
        with open(fixture_path, 'r', encoding='utf-8') as f:
            fixture_data = json.load(f)
        
        team_id_map = {}
        for item in fixture_data:
            model = item['model']
            pk = item['pk']
            fields = item['fields']

            if model == 'teams.team':
                team_obj, created = Team.objects.get_or_create(
                    name=fields['name'],
                    defaults={
                        'logo': fields.get('logo', ''),
                        'budget': Decimal(fields.get('budget', '500000000.00')),
                        'wage_cap': Decimal(fields.get('wage_cap', '5000000.00'))
                    }
                )
                team_id_map[pk] = team_obj
                ClubFacilities.objects.get_or_create(
                    team=team_obj,
                    defaults={
                        'stadium_level': 3,
                        'academy_level': 3,
                        'medical_level': 3,
                        'gym_level': 3,
                        'scouting_level': 3,
                        'training_camp_level': 3
                    }
                )

            elif model == 'teams.player':
                team_fk = fields['team']
                team_obj = team_id_map.get(team_fk)
                if not team_obj:
                    # Fallback lookup by name
                    continue
                Player.objects.update_or_create(
                    team=team_obj,
                    name=fields['name'],
                    defaults={
                        'age': fields['age'],
                        'position': fields['position'],
                        'overall': fields['overall'],
                        'potential_ovr': fields['potential_ovr'],
                        'base_stamina': fields['base_stamina'],
                        'virtual_stamina': Decimal(fields['virtual_stamina']),
                        'wage': Decimal(fields['wage']),
                        'rarity': fields['rarity'],
                    }
                )

        print("Imported/verified FC 26 teams and players from fixture.")

    # 4. Clean Store Packages
    StorePackage.objects.get_or_create(
        name='پک 500 سکه مجازی',
        defaults={'usd_amount': Decimal('5.00'), 'price_irr': 250000, 'is_active': True}
    )
    StorePackage.objects.get_or_create(
        name='پک 2000 سکه طلایی',
        defaults={'usd_amount': Decimal('18.00'), 'price_irr': 900000, 'is_active': True}
    )

    # 5. Clean Gacha Packs
    GachaPack.objects.get_or_create(
        name='پک ستارگان FC 26',
        defaults={
            'cost_usd': Decimal('50.00'),
            'rate_rare': Decimal('70.00'),
            'rate_epic': Decimal('25.00'),
            'rate_legendary': Decimal('5.00'),
            'is_active': True
        }
    )

    print("\n--- FINAL DATABASE STATE ---")
    print(f"Total Teams: {Team.objects.count()} (Expected: 16)")
    print(f"Total Players: {Player.objects.count()}")
    for t in Team.objects.all():
        p_count = Player.objects.filter(team=t).count()
        print(f" - {t.name}: {p_count} players")

if __name__ == '__main__':
    reset_db()
