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
from gacha.models import Pack
from transfers.models import TransferListing, TransferBid, TransferOffer, TransferHistory, TransferLog
from notifications.models import Notification
from matches.models import Match

FC26_TEAMS = [
    'AC Milan', 'Arsenal', 'Atlético Madrid', 'BVB Borussia Dortmund',
    'Chelsea', 'FC Barcelona', 'FC Bayern München', 'Inter',
    'Juventus', 'Liverpool', 'Manchester City', 'Manchester United',
    'Newcastle United', 'Paris Saint-Germain', 'Real Madrid', 'Tottenham Hotspur',
    'AS Roma', 'SSC Napoli'
]

def reset_db():
    print("Starting clean reset to Real FC 26 data...")

    # 1. Clear transfer listings, bids, offers, history, logs, notifications, matches, audit, and tasks
    TransferListing.objects.all().delete()
    TransferBid.objects.all().delete()
    TransferOffer.objects.all().delete()
    TransferHistory.objects.all().delete()
    TransferLog.objects.all().delete()
    Notification.objects.all().delete()
    Match.objects.all().delete()
    try:
        from matches.models import LeagueStanding
        LeagueStanding.objects.all().delete()
    except Exception:
        pass
    try:
        from economy.models import PaymentTransaction, AdminAdjustmentLog
        PaymentTransaction.objects.all().delete()
        AdminAdjustmentLog.objects.all().delete()
    except Exception:
        pass
    try:
        from audit.models import AuditLog
        AuditLog.objects.all().delete()
    except Exception:
        pass
    try:
        from season_pass.models import WeeklyTask, TeamTaskProgress, TeamSeasonPass
        WeeklyTask.objects.all().delete()
        TeamTaskProgress.objects.all().delete()
        TeamSeasonPass.objects.all().delete()
    except Exception:
        pass
    print("Cleared transfer listings, bids, offers, history, logs, notifications, matches, payments, audit, and season tasks.")

    # 2. Delete non-FC26 teams and players
    dummy_teams = Team.objects.exclude(name__in=FC26_TEAMS)
    dummy_team_names = list(dummy_teams.values_list('name', flat=True))
    
    # Detach or delete dummy users
    dummy_users = User.objects.filter(team__name__in=dummy_team_names)
    print(f"Deleting {dummy_users.count()} test users...")
    dummy_users.delete()

    deleted_players, _ = Player.objects.all().delete()
    deleted_teams, _ = dummy_teams.delete()
    print(f"Deleted {deleted_teams} dummy teams and reset all player records.")

    # Copy logos and player photos
    import shutil
    logos_source_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'Team Logos')
    logos_dest_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public', 'assets', 'logos')
    
    if os.path.exists(logos_source_dir):
        os.makedirs(logos_dest_dir, exist_ok=True)
        print("Copying team logos...")
        for filename in os.listdir(logos_source_dir):
            if filename.endswith(".webp") or filename.endswith(".png") or filename.endswith(".jpg"):
                src_path = os.path.join(logos_source_dir, filename)
                dest_path = os.path.join(logos_dest_dir, filename)
                shutil.copy2(src_path, dest_path)

    # Copy player photos for AS Roma and Napoli if present
    players_dest_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public', 'players')
    os.makedirs(players_dest_dir, exist_ok=True)
    for folder_name in ['AS Roma', 'Napoli']:
        folder_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), folder_name)
        if os.path.exists(folder_path):
            for filename in os.listdir(folder_path):
                if filename.endswith(".webp") or filename.endswith(".png"):
                    shutil.copy2(os.path.join(folder_path, filename), os.path.join(players_dest_dir, filename))
    
    # Formations dict based on PES 2021 standard setup
    DEFAULT_FORMATIONS = {
        'AC Milan': '4-5-1 (4-2-3-1)',
        'Arsenal': '4-3-3 (4-3-3)',
        'Atlético Madrid': '4-4-2 (4-4-2)',
        'BVB Borussia Dortmund': '4-5-1 (4-2-3-1)',
        'Chelsea': '4-3-3 (4-3-3)',
        'FC Barcelona': '4-3-3 (4-3-3)',
        'FC Bayern München': '4-5-1 (4-2-3-1)',
        'Inter': '3-5-2 (3-5-2)',
        'Juventus': '4-3-3 (4-3-3)',
        'Liverpool': '4-3-3 (4-3-3)',
        'Manchester City': '4-3-3 (4-3-3)',
        'Manchester United': '4-5-1 (4-2-3-1)',
        'Newcastle United': '4-3-3 (4-3-3)',
        'Paris Saint-Germain': '4-3-3 (4-3-3)',
        'Real Madrid': '4-3-3 (4-3-3)',
        'Tottenham Hotspur': '4-5-1 (4-2-3-1)',
        'AS Roma': '4-5-1 (4-2-3-1)',
        'SSC Napoli': '4-3-3 (4-3-3)',
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
                default_form = DEFAULT_FORMATIONS.get(team_name, '4-3-3 (4-3-3)')
                
                logo_path = fields.get('logo', '')
                if not logo_path and os.path.exists(logos_dest_dir):
                    for filename in os.listdir(logos_dest_dir):
                        if team_name.lower().replace(" ", "-") in filename.lower() or team_name.split()[0].lower() in filename.lower():
                            logo_path = f'/assets/logos/{filename}'
                            break

                team_obj, created = Team.objects.update_or_create(
                    name=team_name,
                    defaults={
                        'logo': logo_path,
                        'budget': Decimal(fields.get('budget', '100000000.00')),
                        'gems': 500,
                        'wage_cap': Decimal(fields.get('wage_cap', '5000000.00')),
                        'star_rating': Decimal(fields.get('star_rating', '4.5')),
                        'default_formation': default_form,
                        'is_active': True
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
                        'training_camp_level': 0
                    }
                )

            elif model == 'teams.player':
                team_fk = fields['team']
                team_obj = team_id_map.get(team_fk)
                if not team_obj:
                    continue
                Player.objects.update_or_create(
                    id=pk,
                    defaults={
                        'name': fields['name'],
                        'team': team_obj,
                        'loan_owner_team': None,
                        'loan_matches_left': 0,
                        'age': fields['age'],
                        'position': fields['position'],
                        'overall': fields['overall'],
                        'potential_ovr': fields['potential_ovr'],
                        'base_stamina': fields['base_stamina'],
                        'virtual_stamina': Decimal('100.00'),
                        'wage': Decimal(fields['wage']),
                        'market_value': Decimal(fields.get('market_value', '1000000.00')),
                        'rarity': fields['rarity'],
                        'is_injured': False,
                        'suspension_matches': 0,
                    }
                )

        print("Imported/verified FC 26 teams and players from fixture.")

        # Squad Lineup and Tactical Starting XI Auto-Assignment
        print("Auto-assigning Starting XI coordinates, shirt numbers, and bench distribution based on PES 2021...")
        from teams.lineup_services import align_all_teams
        align_all_teams()

        # Update Team Star Ratings based on aligned Starting XI and reset budgets/gems
        for t in Team.objects.all():
            t.update_star_rating(save=True)
            t.gems = 500
            t.is_active = True
            t.save(update_fields=['gems', 'is_active'])

        # Reset TeamGamePlans to default unsubmitted state for all clubs
        for t in Team.objects.all():
            TeamGamePlan.objects.update_or_create(
                team=t,
                defaults={'formation': t.default_formation, 'is_submitted': False}
            )

        # Ensure all existing users have usable default passwords
        print("Ensuring all users have active passwords...")
        for u in User.objects.all():
            if u.role in ['admin', 'superadmin'] or u.username in ['coach_admin', 'admin']:
                u.set_password('admin')
            else:
                u.set_password('123456')
            u.is_active = True
            u.save(update_fields=['password', 'is_active'])

    # 4. Clean & Seed Complete Store Packages (Gems and Virtual Budget)
    print("Re-seeding Store Packages...")
    StorePackage.objects.all().delete()
    
    # Gem Packages
    StorePackage.objects.create(
        name='بسته ۲۰۰ الماس (جم)',
        currency_type='GEMS',
        reward_amount=Decimal('200.00'),
        price_irr=49000,
        bonus_amount=Decimal('0.00'),
        description='بسته پایه الماس برای ریکاوری استقامت و تسریع در ارتقای امکانات باشگاه',
        icon_code='gem_small',
        sort_order=1,
        is_active=True
    )
    StorePackage.objects.create(
        name='بسته ۵۰۰ الماس (جم)',
        currency_type='GEMS',
        reward_amount=Decimal('500.00'),
        price_irr=99000,
        bonus_amount=Decimal('50.00'),
        description='بسته محبوب الماس به همراه ۵۰ الماس هدیه ویژه بازگشایی پک‌های گاچا',
        icon_code='gem_medium',
        sort_order=2,
        is_active=True
    )
    StorePackage.objects.create(
        name='بسته ۱۲۰۰ الماس (جم)',
        currency_type='GEMS',
        reward_amount=Decimal('1200.00'),
        price_irr=199000,
        bonus_amount=Decimal('150.00'),
        description='بسته اقتصادی با ۱۵۰ الماس هدیه ویژه برای تقویت چندگانه بازیکنان',
        icon_code='gem_large',
        sort_order=3,
        is_active=True
    )
    StorePackage.objects.create(
        name='بسته ۳۰۰۰ الماس ویژه',
        currency_type='GEMS',
        reward_amount=Decimal('3000.00'),
        price_irr=399000,
        bonus_amount=Decimal('500.00'),
        description='بسته فوق‌العاده الماس با ۵۰۰ الماس هدیه برای تسلط کامل بر بازار و گاچا',
        icon_code='gem_vault',
        sort_order=4,
        is_active=True
    )

    # Virtual Budget Packages
    StorePackage.objects.create(
        name='تزریق بودجه ۲۰ میلیون دلاری',
        currency_type='BUDGET',
        reward_amount=Decimal('20000000.00'),
        price_irr=79000,
        bonus_amount=Decimal('0.00'),
        description='افزایش آنی ۲۰,۰۰۰,۰۰۰ دلار به خزانه باشگاه برای پرداخت دستمزد و خریدهای اولیه',
        icon_code='cash_small',
        sort_order=5,
        is_active=True
    )
    StorePackage.objects.create(
        name='تزریق بودجه ۵۰ میلیون دلاری',
        currency_type='BUDGET',
        reward_amount=Decimal('50000000.00'),
        price_irr=149000,
        bonus_amount=Decimal('5000000.00'),
        description='افزایش ۵۰ میلیون دلار بودجه + ۵ میلیون دلار بونوس ویژه ترنسفر مارکت',
        icon_code='cash_medium',
        sort_order=6,
        is_active=True
    )
    StorePackage.objects.create(
        name='تزریق بودجه ۱۰۰ میلیون دلاری (ویژه)',
        currency_type='BUDGET',
        reward_amount=Decimal('100000000.00'),
        price_irr=269000,
        bonus_amount=Decimal('15000000.00'),
        description='بسته اسپانسری بزرگ با ۱۵ میلیون دلار هدیه برای خرید سوپراستارهای فوتبال',
        icon_code='cash_large',
        sort_order=7,
        is_active=True
    )
    print(f"Seeded {StorePackage.objects.count()} Store Packages.")

    # 5. Clean & Seed Gacha Packs and Player Pools
    print("Re-seeding Gacha Packs and Player Pools...")
    Pack.objects.all().delete()
    try:
        from scripts.seed_packs import seed_packs
        seed_packs()
    except Exception as e:
        print(f"Warning seeding packs: {e}")

    print("\n--- FINAL DATABASE STATE ---")
    print(f"Total Teams: {Team.objects.count()} (Expected: 16)")
    print(f"Total Players: {Player.objects.count()}")
    print(f"Total Store Packages: {StorePackage.objects.count()}")
    print(f"Total Gacha Packs: {Pack.objects.count()}")
    for t in Team.objects.all():
        p_count = Player.objects.filter(team=t).count()
        print(f" - {t.name}: {p_count} players | Budget: ${t.budget:,.0f} | Gems: {t.gems}")

if __name__ == '__main__':
    reset_db()
