import os
import sys
import json
import django
from decimal import Decimal

sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player, ClubFacilities, TeamGamePlan
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

    # 1. Clear transfer listings, notifications, matches, and tasks
    TransferListing.objects.all().delete()
    Notification.objects.all().delete()
    Match.objects.all().delete()
    try:
        from season_pass.models import WeeklyTask, TeamTaskProgress
        WeeklyTask.objects.all().delete()
        TeamTaskProgress.objects.all().delete()
    except Exception:
        pass
    print("Cleared transfer listings, notifications, matches, and season tasks.")

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

    # Copy logos
    import shutil
    logos_source_dir = r"E:\Codes\Virtual Master League\Team Logos"
    logos_dest_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public', 'assets', 'logos')
    
    if os.path.exists(logos_source_dir):
        os.makedirs(logos_dest_dir, exist_ok=True)
        print("Copying team logos...")
        for filename in os.listdir(logos_source_dir):
            if filename.endswith(".webp") or filename.endswith(".png") or filename.endswith(".jpg"):
                src_path = os.path.join(logos_source_dir, filename)
                dest_path = os.path.join(logos_dest_dir, filename)
                shutil.copy2(src_path, dest_path)
    
    # Formations dict based on standard real-world setup
    DEFAULT_FORMATIONS = {
        'AC Milan': '4-2-3-1', 
        'Arsenal': '4-3-3', 
        'Atlético Madrid': '5-3-2', 
        'BVB Borussia Dortmund': '4-2-3-1',
        'Chelsea': '4-2-3-1', 
        'FC Barcelona': '4-3-3', 
        'FC Bayern München': '4-2-3-1', 
        'Inter': '3-5-2',
        'Juventus': '3-5-2', 
        'Liverpool': '4-3-3', 
        'Manchester City': '3-2-4-1', 
        'Manchester United': '4-2-3-1',
        'Newcastle United': '4-3-3', 
        'Paris Saint-Germain': '4-3-3', 
        'Real Madrid': '4-3-1-2', 
        'Tottenham Hotspur': '4-2-3-1'
    }

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
                # find logo filename mapping
                team_name = fields['name']
                default_form = DEFAULT_FORMATIONS.get(team_name, '4-3-3')
                
                logo_path = fields.get('logo', '')
                if not logo_path and os.path.exists(logos_dest_dir):
                    # Try to find a matching logo file
                    for filename in os.listdir(logos_dest_dir):
                        # Simple naive match (e.g. "england_arsenal")
                        # You could implement better matching, but this is a heuristic
                        if team_name.lower().replace(" ", "-") in filename.lower() or team_name.split()[0].lower() in filename.lower():
                            logo_path = f'/assets/logos/{filename}'
                            break

                team_obj, created = Team.objects.update_or_create(
                    name=team_name,
                    defaults={
                        'logo': logo_path,
                        'budget': Decimal(fields.get('budget', '500000000.00')),
                        'wage_cap': Decimal(fields.get('wage_cap', '5000000.00')),
                        'default_formation': default_form
                    }
                )
                team_id_map[pk] = team_obj
                ClubFacilities.objects.update_or_create(
                    team=team_obj,
                    defaults={
                        'stadium_level': 0,
                        'academy_level': 0,
                        'medical_level': 0,
                        'gym_level': 0,
                        'pool_level': 0,
                        'scouting_level': 0,
                        'training_camp_level': 0
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

        # Squad Lineup and Tactical Starting XI Auto-Assignment
        print("Auto-assigning Starting XI coordinates, shirt numbers, and bench distribution...")
        from teams.lineup_services import align_all_teams
        align_all_teams()

        # Reset TeamGamePlans to default unsubmitted state for all clubs
        for t in Team.objects.all():
            TeamGamePlan.objects.update_or_create(
                team=t,
                defaults={'formation': t.default_formation, 'is_submitted': False}
            )

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
