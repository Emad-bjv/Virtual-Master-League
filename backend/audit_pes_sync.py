import os
import sys
import glob
import re
import django
import unicodedata

sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from teams.models import Player, Team

def clean_name(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('-', ' ').replace('.', ' ').replace("'", '').replace('’', '').replace('`', '').strip().lower()
    return re.sub(r'\s+', ' ', s)

# Load all players in DB
db_players = list(Player.objects.select_related('team').all())
db_name_map = {}
for p in db_players:
    db_name_map[clean_name(p.name)] = p

# Parse all PES files
pes_players = []
for fpath in sorted(glob.glob('ABDM_files/player_statistics*.md')):
    with open(fpath, 'r', encoding='utf-8') as f:
        curr_team = "Unknown"
        for line in f:
            line = line.strip()
            if line.startswith('## '):
                curr_team = line.replace('## ', '').strip()
            elif line.startswith('|') and not line.startswith('| :') and not 'نام بازیکن' in line:
                parts = [p.strip() for p in line.split('|')[1:-1]]
                if len(parts) >= 3:
                    pname, pos, ovr_str = parts[0], parts[1], parts[2]
                    try:
                        ovr = int(ovr_str)
                    except ValueError:
                        continue
                    pes_players.append({
                        'raw_name': pname,
                        'clean_name': clean_name(pname),
                        'pos': pos,
                        'ovr': ovr,
                        'pes_team': curr_team,
                        'file': os.path.basename(fpath)
                    })

total_pes = len(pes_players)
matched = []
missing = []
mismatched_ovr = []

for pes_p in pes_players:
    cn = pes_p['clean_name']
    match = db_name_map.get(cn)
    
    if not match:
        # Try substring
        for db_cn, p_obj in db_name_map.items():
            if len(cn) > 4 and len(db_cn) > 4:
                if cn in db_cn or db_cn in cn:
                    match = p_obj
                    break
                    
    if match:
        matched.append({
            'pes': pes_p,
            'db': match
        })
        if match.overall != pes_p['ovr']:
            mismatched_ovr.append({
                'name': pes_p['raw_name'],
                'pes_ovr': pes_p['ovr'],
                'db_ovr': match.overall,
                'team': match.team.name if match.team else 'Free Agent'
            })
    else:
        missing.append(pes_p)

print("=================================================================")
print(" PES VS DATABASE AUDIT & SYNCHRONIZATION REPORT")
print("=================================================================")
print(f"Total Players in Reference PES Files: {total_pes}")
print(f"Total Players in Database:            {len(db_players)}")
print(f"Successfully Matched PES Players:     {len(matched)} / {total_pes} ({(len(matched)/total_pes)*100:.1f}%)")
print(f"Missing PES Players:                  {len(missing)}")
print(f"Overall Mismatches:                   {len(mismatched_ovr)}")
print("=================================================================\n")

if missing:
    print("--- MISSING PLAYERS ---")
    for m in missing:
        print(f"- {m['raw_name']} ({m['pos']} - {m['ovr']}) [{m['pes_team']}]")
else:
    print("✅ 100% MATCH: All players from the reference PES files exist in the database!")

# Team player counts in DB
print("\n--- SQUAD SIZES PER CLUB IN DATABASE ---")
for t in Team.objects.all().order_by('name'):
    count = Player.objects.filter(team=t).count()
    print(f"- {t.name}: {count} بازیکن (⭐ {t.star_rating or '4.0'})")

free_agents = Player.objects.filter(team__isnull=True).count() + Player.objects.filter(is_free_agent=True).count()
print(f"- بازیکنان آزاد (Free Agents): {free_agents}")
