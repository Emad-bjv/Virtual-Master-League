import os
import sys
import glob
import re
import django
import unicodedata
from decimal import Decimal

# Configure standalone Django execution
sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from teams.models import Team, Player
from transfers.models import TransferHistory, TransferLog

TEAM_NAME_MAP = {
    'لیورپول': 'Liverpool',
    'بایرن مونیخ': 'FC Bayern',
    'آرسنال': 'Arsenal',
    'چلسی': 'Chelsea',
    'منچستر یونایتد': 'Manchester United',
    'منچستر سیتی': 'Manchester City',
    'رئال مادرید': 'Real Madrid',
    'بارسلونا': 'FC Barcelona',
    'پاری سن-ژرمن': 'Paris Saint-Germain',
    'یوونتوس': 'Juventus',
    'تاتنهام': 'Tottenham Hotspur',
    'اتلتیکو مادرید': 'Atlético Madrid',
    'اینتر میلان': 'Inter',
    'آ.ث. میلان': 'AC Milan',
    'ناپولی': 'Napoli',
    'نیوکاسل': 'Newcastle United',
    'دورتموند': 'Borussia Dortmund',
    'آ.اس. رم': 'Roma',
}

# Known destination overrides based on latest completed transfers
TRANSFER_DESTINATION_OVERRIDES = {
    'kenan yildiz': 'Manchester United',
    'kenan yıldız': 'Manchester United',
    'donyell malen': 'AC Milan',
    'rasmus hojlund': 'Paris Saint-Germain',
    'rasmus højlund': 'Paris Saint-Germain',
    'rafael leao': 'Chelsea',
    'rafael leão': 'Chelsea',
    'enzo fernandez': 'Inter',
    'enzo fernández': 'Inter',
    'khvicha kvaratskhelia': 'Paris Saint-Germain',
    'k. kvaratskhelia': 'Paris Saint-Germain',
    'federico dimarco': 'Chelsea',
    'f. dimarco': 'Chelsea',
    'alexis saelemaekers': 'AC Milan',
    'a. saelemaekers': 'AC Milan',
    'ousmane dembele': 'Paris Saint-Germain',
    'ousmane dembélé': 'Paris Saint-Germain',
    'o. dembele': 'Paris Saint-Germain',
    'o. dembélé': 'Paris Saint-Germain',
    'andre onana': 'Manchester United',
    'andré onana': 'Manchester United',
}

def clean_name(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('-', ' ').replace('.', ' ').replace("'", '').replace('’', '').replace('`', '').strip().lower()
    return re.sub(r'\s+', ' ', s)

def calculate_rarity(ovr):
    if ovr >= 88:
        return 'LEGENDARY'
    elif ovr >= 84:
        return 'EPIC'
    elif ovr >= 80:
        return 'RARE'
    return 'REGULAR'

def estimate_market_value(ovr):
    if ovr >= 90: return Decimal('120000000.00')
    if ovr >= 87: return Decimal('85000000.00')
    if ovr >= 85: return Decimal('65000000.00')
    if ovr >= 83: return Decimal('45000000.00')
    if ovr >= 80: return Decimal('30000000.00')
    if ovr >= 77: return Decimal('18000000.00')
    if ovr >= 74: return Decimal('10000000.00')
    return Decimal('5000000.00')

def resolve_team(pes_header):
    for k, v in TEAM_NAME_MAP.items():
        if k in pes_header:
            t = Team.objects.filter(name__icontains=v).first()
            if t: return t
    # Fallback to direct search
    clean_h = re.sub(r'[\(\)\-]', ' ', pes_header)
    for word in clean_h.split():
        if len(word) >= 4:
            t = Team.objects.filter(name__icontains=word).first()
            if t: return t
    return None

print("=================================================================")
print(" ALL-IN-ONE PES ROSTER RESTORATION & TRANSFER SYNCHRONIZER")
print("=================================================================\n")

# 1. Parse all PES markdown files
pes_files = sorted(
    glob.glob('ABDM_files/player_statistics*.md') +
    glob.glob('backend/ABDM_files/player_statistics*.md') +
    glob.glob('../ABDM_files/player_statistics*.md') +
    glob.glob('/opt/vml/ABDM_files/player_statistics*.md')
)
# De-duplicate file paths by filename
unique_files = {}
for f in pes_files:
    unique_files[os.path.basename(f)] = f
pes_files = list(unique_files.values())

pes_players = []
for fpath in pes_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        curr_team_header = ""
        for line in f:
            line = line.strip()
            if line.startswith('## '):
                curr_team_header = line.replace('## ', '').strip()
            elif line.startswith('|') and not line.startswith('| :') and not 'نام بازیکن' in line:
                parts = [p.strip() for p in line.split('|')[1:-1]]
                if len(parts) >= 3:
                    pname, pos, ovr_str = parts[0], parts[1], parts[2]
                    try:
                        ovr = int(ovr_str)
                    except ValueError:
                        continue
                    pes_players.append({
                        'name': pname,
                        'pos': pos,
                        'ovr': ovr,
                        'team_header': curr_team_header,
                        'file': os.path.basename(fpath)
                    })

print(f"Total PES files found: {len(pes_files)}")
print(f"Total PES player entries found: {len(pes_players)}")

created_count = 0
updated_count = 0
skipped_count = 0

for item in pes_players:
    raw_name = item['name']
    c_name = clean_name(raw_name)
    pos = item['pos']
    ovr = item['ovr']
    pes_header = item['team_header']

    base_team = resolve_team(pes_header)
    
    # Check if this player has an active transfer destination override
    dest_team_name = TRANSFER_DESTINATION_OVERRIDES.get(c_name)
    target_team = None
    if dest_team_name:
        target_team = Team.objects.filter(name__icontains=dest_team_name).first()
    if not target_team:
        target_team = base_team

    # Try matching existing player
    existing_player = None
    
    # 1. Exact match
    existing_player = Player.objects.filter(name__iexact=raw_name).first()
    
    # 2. Normalized match
    if not existing_player:
        for p in Player.objects.all():
            if clean_name(p.name) == c_name:
                existing_player = p
                break
                
    # 3. Substring/token match
    if not existing_player and len(c_name) > 5:
        for p in Player.objects.all():
            p_c = clean_name(p.name)
            if len(p_c) > 5 and (c_name in p_c or p_c in c_name):
                existing_player = p
                break

    rarity = calculate_rarity(ovr)
    base_stamina = min(99, max(60, ovr + (3 if pos != 'GK' else 0)))
    mv = estimate_market_value(ovr)

    if existing_player:
        # Update existing player stats
        existing_player.overall = ovr
        existing_player.base_overall = ovr
        existing_player.position = pos
        existing_player.base_stamina = base_stamina
        existing_player.rarity = rarity
        if target_team and (not existing_player.team or existing_player.is_free_agent):
            existing_player.team = target_team
            existing_player.is_free_agent = False
        existing_player.save()
        updated_count += 1
    else:
        # Create missing player
        Player.objects.create(
            name=raw_name,
            position=pos,
            overall=ovr,
            base_overall=ovr,
            potential_ovr=ovr + 5,
            age=24,
            base_stamina=base_stamina,
            virtual_stamina=Decimal('100.00'),
            wage=Decimal('120000.00'),
            market_value=mv,
            rarity=rarity,
            team=target_team,
            is_free_agent=False if target_team else True,
            level=1,
            xp=0,
            total_xp=0
        )
        created_count += 1
        print(f"[CREATED] {raw_name} ({pos} - {ovr}) -> {target_team.name if target_team else 'Free Agent'}")

# Update star ratings for all teams
for t in Team.objects.all():
    if hasattr(t, 'update_star_rating'):
        t.update_star_rating()

print("\n=================================================================")
print(f" RESTORATION SUMMARY:")
print(f" - Newly Created & Restored Players: {created_count}")
print(f" - Updated Existing Players: {updated_count}")
print(f" - Total Players in Database: {Player.objects.count()}")
print("=================================================================")
