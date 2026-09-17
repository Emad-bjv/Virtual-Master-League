import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=25)

script = """
import sys, json
from datetime import datetime, timezone
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

cut_time = datetime(2026, 9, 17, 9, 0, 0, tzinfo=timezone.utc)
synthetic_ths = TransferHistory.objects.filter(id__gte=592, id__lte=662)
pids = sorted(list(set(synthetic_ths.values_list('player_id', flat=True))))
valid_ths = TransferHistory.objects.exclude(id__gte=592, id__lte=662).order_by('transferred_at', 'id')

report = []
for pid in pids:
    p = Player.objects.get(id=pid)
    
    # Check latest action log before cut_time
    logs_before = TransferLog.objects.filter(
        timestamp__lt=cut_time
    ).filter(
        description__icontains=p.name
    ).exclude(
        event_type__in=['OFFER_MADE', 'OFFER_REJECTED', 'OFFER_CANCELLED', 'COUNTER_OFFER']
    ).order_by('timestamp')
    latest_log = logs_before.last()
    
    latest_th = valid_ths.filter(player=p).last()
    
    # Specific known swap players:
    # 1. Rodrygo (1113): swapped to Liverpool in Offer 842 on Sep 16
    # 2. Doku (1006): swapped to Real Madrid in Offer 812 on Sep 14
    # 3. Kevin Danso (1144): swapped to Real Madrid in Offer 650 on Aug 29
    # 4. David Alaba (1138): swapped to AS Roma in Offer 533 on Aug 28
    
    if p.id == 1113:
        correct_team = "Liverpool"
        proof = "معاوضه در ازای محمد صلاح (۱۶ سپتامبر / ۲۶ شهریور)"
    elif p.id == 1006:
        correct_team = "Real Madrid"
        proof = "معاوضه در ازای وینیسیوس + ۴۰۰ میلیون (۱۴ سپتامبر / ۲۴ شهریور)"
    elif p.id == 1144:
        correct_team = "Real Madrid"
        proof = "معاوضه در ازای آنگیسا + ۴۶ میلیون (۲۹ آگوست)"
    elif p.id == 1138:
        correct_team = "AS Roma"
        proof = "معاوضه در ازای رونالد آرائوخو + ۱۰ میلیون (۲۸ آگوست)"
    elif latest_th:
        if latest_th.transfer_type == 'RELEASE' or latest_th.buyer_team is None:
            correct_team = "بازیکن آزاد (فسخ شده)"
            proof = f"فسخ قرارداد در {str(latest_th.transferred_at)[:10]}"
        else:
            correct_team = latest_th.buyer_team.name if latest_th.buyer_team else "بدون تیم"
            s_name = latest_th.seller_team.name if latest_th.seller_team else "بازیکن آزاد"
            b_name = latest_th.buyer_team.name if latest_th.buyer_team else "بدون تیم"
            proof = f"انتقال {s_name} -> {b_name} ({str(latest_th.transferred_at)[:10]})"
    else:
        # Never transferred
        correct_team = p.base_team.name if p.base_team else "بدون تیم"
        proof = f"اسکواد پایه باشگاه {correct_team} (بدون ترنسفر معتبر)"
        
    curr_team = p.team.name if p.team else "بازیکن آزاد"
    is_changed = (curr_team != correct_team)
    
    report.append({
        'id': p.id,
        'name': p.name,
        'current_broken': curr_team,
        'correct_team': correct_team,
        'proof': proof,
        'is_changed': is_changed
    })

print(json.dumps(report, ensure_ascii=False, indent=2))
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
if err:
    print("STDERR:", err)
with open('scratch/report_51_players.json', 'w', encoding='utf-8') as f:
    f.write(out)
print(f"Wrote scratch/report_51_players.json, size {len(out)} chars")
client.close()
