import os, sys, glob, re, django, unicodedata
sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Player, Team
from transfers.models import TransferHistory, TransferLog

# 1. Parse all PES markdown files
pes_players = []
for fpath in sorted(glob.glob('ABDM_files/player_statistics*.md')):
    fname = os.path.basename(fpath)
    with open(fpath, 'r', encoding='utf-8') as f:
        curr_team = "Unknown"
        for line in f:
            line = line.strip()
            if line.startswith('## '):
                curr_team = line.replace('## ', '').split('(')[0].strip()
            elif line.startswith('|') and not line.startswith('| :') and not 'نام بازیکن' in line:
                parts = [p.strip() for p in line.split('|')[1:-1]]
                if len(parts) >= 3:
                    pname, pos, ovr = parts[0], parts[1], parts[2]
                    pes_players.append({
                        'name': pname,
                        'pos': pos,
                        'ovr': ovr,
                        'team': curr_team,
                        'file': fname
                    })

print(f"Total players in PES markdown files: {len(pes_players)}")

# 2. Identify players with special characters or abbreviated names
special_char_pattern = re.compile(r'[^\x00-\x7F]|\.|\b[A-Z]\b')
unusual_players = []
for p in pes_players:
    name = p['name']
    has_special = bool(special_char_pattern.search(name))
    is_short = len(name.split()) == 1 or '.' in name or bool(re.search(r'\b[A-Z]\b', name))
    if has_special or is_short:
        unusual_players.append(p)

print(f"Unusual/Special names in PES: {len(unusual_players)}")

# 3. Get recent transfers from DB (TransferHistory & TransferLog)
transfers_summary = []
for th in TransferHistory.objects.select_related('player', 'buyer_team', 'seller_team').order_by('-transferred_at')[:50]:
    transfers_summary.append({
        'player': th.player.name if th.player else 'Unknown',
        'buyer': th.buyer_team.name if th.buyer_team else 'Free Agent',
        'seller': th.seller_team.name if th.seller_team else 'Free Agent',
        'fee': float(th.price_usd or 0),
        'type': th.transfer_type
    })

# Write markdown report
with open('pes_analysis_report.md', 'w', encoding='utf-8') as out:
    out.write("# گزارش جامع بازیکنان PES و نقل‌وانتقالات اخیر\n\n")
    
    out.write("## ۱. بازیکنان با اسامی خاص، مخفف یا دارای کاراکترهای ویژه (PES)\n")
    out.write("| # | نام در PES | پست | اورال | تیم PES | نوع ساختار نام |\n")
    out.write("|---|---|:---:|:---:|---|---|\n")
    for i, p in enumerate(unusual_players, 1):
        reason = []
        if re.search(r'[^\x00-\x7F]', p['name']): reason.append("حروف خاص لاتین (á/é/ö/...)")
        if '.' in p['name']: reason.append("حرف اول مخفف (نقطه دار)")
        if len(p['name'].split()) == 1: reason.append("تک اسمی")
        out.write(f"| {i} | **{p['name']}** | {p['pos']} | {p['ovr']} | {p['team']} | {', '.join(reason)} |\n")
        
    out.write("\n## ۲. آخرین نقل‌وانتقالات ثبت شده در سیستم\n")
    out.write("| # | بازیکن | تیم مبدا | تیم مقصد | مبلغ | نوع انتقال |\n")
    out.write("|---|---|---|---|---|:---:|\n")
    for i, t in enumerate(transfers_summary, 1):
        out.write(f"| {i} | **{t['player']}** | {t['seller']} | {t['buyer']} | {t['fee']:,.0f} $ | {t['type']} |\n")

print("Report generated in pes_analysis_report.md")
