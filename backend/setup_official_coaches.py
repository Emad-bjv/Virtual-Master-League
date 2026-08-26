import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User
from teams.models import Team

OFFICIAL_COACHES = [
    {
        'team_keywords': ['arsenal'],
        'username': 'arsenal_coach',
        'password': 'RedCannon-84',
        'team_name': 'Arsenal'
    },
    {
        'team_keywords': ['milan', 'ac milan'],
        'username': 'milan_tactics',
        'password': 'DevilStar*62',
        'team_name': 'AC Milan'
    },
    {
        'team_keywords': ['atlético', 'atletico'],
        'username': 'atletico_lead',
        'password': 'IronShield#91',
        'team_name': 'Atlético Madrid'
    },
    {
        'team_keywords': ['barcelona', 'barca'],
        'username': 'barca_master',
        'password': 'BluePass!73',
        'team_name': 'FC Barcelona'
    },
    {
        'team_keywords': ['bayern', 'münchen', 'munchen'],
        'username': 'bayern_force',
        'password': 'ThunderStorm@58',
        'team_name': 'FC Bayern München'
    },
    {
        'team_keywords': ['dortmund', 'bvb'],
        'username': 'bvb_manager',
        'password': 'YellowPower$37',
        'team_name': 'BVB Borussia Dortmund'
    },
    {
        'team_keywords': ['chelsea'],
        'username': 'chelsea_boss',
        'password': 'BlueLion-49',
        'team_name': 'Chelsea'
    },
    {
        'team_keywords': ['inter'],
        'username': 'inter_chief',
        'password': 'BlackSnake*16',
        'team_name': 'Inter'
    },
    {
        'team_keywords': ['juventus', 'juve'],
        'username': 'juve_command',
        'password': 'ZebraSprint#82',
        'team_name': 'Juventus'
    },
    {
        'team_keywords': ['liverpool'],
        'username': 'liverpool_pro',
        'password': 'KopCrown!25',
        'team_name': 'Liverpool'
    },
    {
        'team_keywords': ['manchester city', 'man city'],
        'username': 'mancity_hub',
        'password': 'SkyEngine@94',
        'team_name': 'Manchester City'
    },
    {
        'team_keywords': ['manchester united', 'man united'],
        'username': 'united_core',
        'password': 'GloryStrike$63',
        'team_name': 'Manchester United'
    },
    {
        'team_keywords': ['newcastle'],
        'username': 'newcastle_unit',
        'password': 'BlackCastle-18',
        'team_name': 'Newcastle United'
    },
    {
        'team_keywords': ['paris', 'psg'],
        'username': 'psg_dynasty',
        'password': 'ParisTower*75',
        'team_name': 'Paris Saint-Germain'
    },
    {
        'team_keywords': ['real madrid', 'real'],
        'username': 'realmadrid_win',
        'password': 'WhiteKing#41',
        'team_name': 'Real Madrid'
    },
    {
        'team_keywords': ['tottenham', 'spurs'],
        'username': 'spurs_arena',
        'password': 'SilverSpur!89',
        'team_name': 'Tottenham Hotspur'
    },
    {
        'team_keywords': ['roma', 'as roma'],
        'username': 'roma_gladiator',
        'password': 'WolfArena@34',
        'team_name': 'AS Roma'
    },
    {
        'team_keywords': ['napoli', 'ssc napoli'],
        'username': 'napoli_prime',
        'password': 'OceanWave$52',
        'team_name': 'SSC Napoli'
    },
]

def apply_official_credentials():
    print("Applying official coach credentials...")
    for item in OFFICIAL_COACHES:
        uname = item['username']
        pwd = item['password']
        
        # 1. Get or create user
        user, created = User.objects.get_or_create(
            username=uname,
            defaults={
                'role': 'coach',
                'virtual_dollars': 1000000.00,
                'is_active': True
            }
        )
        user.role = 'coach'
        user.is_active = True
        user.set_password(pwd)
        user.save()

        # 2. Find and assign team
        target_team = None
        for kw in item['team_keywords']:
            target_team = Team.objects.filter(name__icontains=kw).first()
            if target_team:
                break
        
        if target_team:
            target_team.manager = user
            target_team.save(update_fields=['manager'])
            print(f"[OK] Linked {uname} -> {target_team.name} (Password set to: {pwd})")
        else:
            print(f"[WARN] Team not found for {uname} ({item['team_name']})")

    # Ensure admin users exist
    for adm_name in ['admin', 'coach_admin']:
        admin_user, _ = User.objects.get_or_create(
            username=adm_name,
            defaults={'role': 'admin', 'is_staff': True, 'is_superuser': True}
        )
        admin_user.set_password('admin')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.role = 'admin'
        admin_user.save()
        print(f"[OK] Admin user '{adm_name}' verified with password 'admin'.")

if __name__ == '__main__':
    apply_official_credentials()
