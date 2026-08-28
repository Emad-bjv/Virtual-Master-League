import os, sys, glob, re, django, unicodedata

sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Player, Team

def normalize_name(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('-', ' ').replace('.', ' ').replace("'", '').replace('’', '').replace('`', '').strip().lower()
    return re.sub(r'\s+', ' ', s)

# Build a lookup of existing DB players
db_players = Player.objects.all()
db_lookup = {}
for p in db_players:
    n_norm = normalize_name(p.name)
    db_lookup[n_norm] = p
    # Also add last name or split tokens if unique
    tokens = n_norm.split()
    if len(tokens) >= 2:
        db_lookup[tokens[-1]] = p

# Parse PES files
pes_data = []
for fpath in sorted(glob.glob('ABDM_files/player_statistics*.md')):
    with open(fpath, 'r', encoding='utf-8') as f:
        curr_team = "نامشخص"
        for line in f:
            line = line.strip()
            if line.startswith('## '):
                curr_team = line.replace('## ', '').strip()
            elif line.startswith('|') and not line.startswith('| :') and not 'نام بازیکن' in line:
                parts = [p.strip() for p in line.split('|')[1:-1]]
                if len(parts) >= 3:
                    pname, pos, ovr = parts[0], parts[1], parts[2]
                    pes_data.append({
                        'raw_name': pname,
                        'norm_name': normalize_name(pname),
                        'pos': pos,
                        'ovr': ovr,
                        'pes_team': curr_team,
                        'file': os.path.basename(fpath)
                    })

print(f"Total PES Players: {len(pes_data)}")
print(f"Total DB Players: {db_players.count()}")

missing_players = []
matched_players = []

for pes_p in pes_data:
    n = pes_p['norm_name']
    match = None
    
    # 1. Exact normalized match
    if n in db_lookup:
        match = db_lookup[n]
    else:
        # 2. Check if any db player name contains or is contained in pes name
        for db_n, p_obj in db_lookup.items():
            if len(n) > 4 and len(db_n) > 4:
                if n in db_n or db_n in n:
                    match = p_obj
                    break
            # Check last name match
            tokens_pes = n.split()
            tokens_db = db_n.split()
            if len(tokens_pes) >= 2 and len(tokens_db) >= 2:
                if tokens_pes[-1] == tokens_db[-1] and tokens_pes[0][0] == tokens_db[0][0]:
                    match = p_obj
                    break

    if match:
        matched_players.append((pes_p, match))
    else:
        missing_players.append(pes_p)

print(f"Matched: {len(matched_players)}")
print(f"Missing from DB: {len(missing_players)}")

# Group missing players by team
grouped_missing = {}
for p in missing_players:
    t = p['pes_team']
    if t not in grouped_missing:
        grouped_missing[t] = []
    grouped_missing[t].append(p)

with open('missing_from_server_list.md', 'w', encoding='utf-8') as out:
    out.write(f"# لیست بازیکنان موجود در فایل‌های مرجع PES که در دیتابیس سرور نیستند ({len(missing_players)} بازیکن)\n\n")
    for team, p_list in grouped_missing.items():
        out.write(f"### {team} ({len(p_list)} بازیکن)\n")
        out.write("| # | نام بازیکن | پست | اورال PES | فایل مرجع |\n")
        out.write("|---|---|:---:|:---:|:---:|\n")
        for i, p in enumerate(p_list, 1):
            out.write(f"| {i} | **{p['raw_name']}** | {p['pos']} | {p['ovr']} | `{p['file']}` |\n")
        out.write("\n")

print("Report saved to missing_from_server_list.md")
