import os
import sys
import django
from decimal import Decimal

# Configure standalone Django execution
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from teams.models import Team, Player
from transfers.models import TransferHistory, TransferLog

def calculate_rarity(ovr):
    if ovr >= 88:
        return 'LEGENDARY'
    elif ovr >= 84:
        return 'EPIC'
    elif ovr >= 80:
        return 'RARE'
    return 'REGULAR'

def restore_player(search_names, canonical_name, position, overall, age, market_value_usd, target_team_name, original_team_name=None):
    # 1. Find or create target team
    target_team = None
    for t_name in [target_team_name, target_team_name.split()[0]]:
        target_team = Team.objects.filter(name__icontains=t_name).first()
        if target_team:
            break

    if not target_team:
        print(f"[ERROR] Target team '{target_team_name}' not found!")
        return None

    # 2. Check if player already exists
    player = None
    for s_name in search_names:
        p = Player.objects.filter(name__iexact=s_name).first()
        if p:
            player = p
            break
    if not player:
        for s_name in search_names:
            p = Player.objects.filter(name__icontains=s_name).first()
            if p:
                player = p
                break

    rarity = calculate_rarity(overall)
    base_stamina = min(99, max(60, overall + (3 if position != 'GK' else 0)))

    if player:
        print(f"[FOUND] Existing player: '{player.name}' (ID: {player.id}). Updating...")
        player.name = canonical_name
        player.position = position
        player.overall = overall
        player.base_overall = overall
        player.potential_ovr = max(player.potential_ovr or 0, overall + 5)
        player.team = target_team
        player.is_free_agent = False
        player.rarity = rarity
        player.base_stamina = base_stamina
        player.save()
    else:
        print(f"[CREATE] Creating new player: '{canonical_name}' -> {target_team.name}")
        player = Player.objects.create(
            name=canonical_name,
            position=position,
            overall=overall,
            base_overall=overall,
            potential_ovr=overall + 7,
            age=age,
            base_stamina=base_stamina,
            virtual_stamina=Decimal('100.00'),
            wage=Decimal('150000.00'),
            market_value=Decimal(str(market_value_usd)),
            rarity=rarity,
            team=target_team,
            is_free_agent=False,
            level=1,
            xp=0,
            total_xp=0
        )

    # 3. Create TransferHistory record if not exists
    history_exists = TransferHistory.objects.filter(player=player, buyer_team=target_team).exists()
    if not history_exists:
        seller = None
        if original_team_name:
            seller = Team.objects.filter(name__icontains=original_team_name).first()
        
        TransferHistory.objects.create(
            player=player,
            buyer_team=target_team,
            seller_team=seller,
            price_usd=Decimal(str(market_value_usd)),
            transfer_type='PERMANENT'
        )
        print(f"  -> Added TransferHistory: {seller.name if seller else 'Free Agent'} -> {target_team.name}")

    # 4. Update team star rating
    if hasattr(target_team, 'update_star_rating'):
        target_team.update_star_rating()

    print(f"[SUCCESS] '{canonical_name}' ({position} - {overall}) is now active at '{target_team.name}' (Team ID: {target_team.id})\n")
    return player

print("=================================================================")
print(" RESTORING 3 SPECIFIC PLAYERS TO THE DATABASE & THEIR CLUBS")
print("=================================================================\n")

# 1. Kenan Yıldız -> Manchester United (was Juventus)
restore_player(
    search_names=['Kenan Yildiz', 'Kenan Yıldız', 'K. Yildiz', 'K. Yıldız', 'Yildiz', 'Yıldız'],
    canonical_name='Kenan Yıldız',
    position='LWF',
    overall=81,
    age=20,
    market_value_usd=80000000.00,
    target_team_name='Manchester United',
    original_team_name='Juventus'
)

# 2. Donyell Malen -> AC Milan (was Borussia Dortmund)
restore_player(
    search_names=['Donyell Malen', 'D. Malen', 'Malen'],
    canonical_name='Donyell Malen',
    position='CF',
    overall=82,
    age=26,
    market_value_usd=55000000.00,
    target_team_name='AC Milan',
    original_team_name='Borussia Dortmund'
)

# 3. Rasmus Højlund -> Paris Saint-Germain (was SSC Napoli / Man United)
restore_player(
    search_names=['Rasmus Højlund', 'Rasmus Hojlund', 'R. Højlund', 'R. Hojlund', 'Højlund', 'Hojlund'],
    canonical_name='Rasmus Højlund',
    position='CF',
    overall=81,
    age=22,
    market_value_usd=70000000.00,
    target_team_name='Paris Saint-Germain',
    original_team_name='SSC Napoli'
)

print("=================================================================")
print(" ALL 3 PLAYERS SUCCESSFULLY RESTORED!")
print("=================================================================")
