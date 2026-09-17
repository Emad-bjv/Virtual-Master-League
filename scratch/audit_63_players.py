import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=25)

script = """
import sys
from datetime import datetime, timezone
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

cut_time = datetime(2026, 9, 17, 9, 0, 0, tzinfo=timezone.utc)
synthetic_ths = TransferHistory.objects.filter(id__gte=592, id__lte=662)
pids = sorted(list(set(synthetic_ths.values_list('player_id', flat=True))))

print(f"Auditing {len(pids)} players touched by TH 592..662...")
results = []
for pid in pids:
    p = Player.objects.get(id=pid)
    
    # Check latest log before cut_time (before today 09:00 UTC)
    # that indicates a transfer or team change
    logs_before = TransferLog.objects.filter(
        timestamp__lt=cut_time
    ).filter(
        description__icontains=p.name
    ).exclude(
        event_type__in=['OFFER_MADE', 'OFFER_REJECTED', 'OFFER_CANCELLED', 'COUNTER_OFFER']
    ).order_by('timestamp')
    
    latest_action_log = logs_before.last()
    
    # Latest valid TH
    valid_th = TransferHistory.objects.filter(player=p, transferred_at__lt=cut_time).order_by('transferred_at', 'id').last()
    
    results.append({
        'id': p.id,
        'name': p.name,
        'current_team': p.team.name if p.team else 'Free Agent',
        'base_team': p.base_team.name if p.base_team else 'None',
        'latest_th': f"{valid_th.id}: {valid_th.seller_team} -> {valid_th.buyer_team} ({valid_th.transfer_type})" if valid_th else "None",
        'latest_log': f"[{str(latest_action_log.timestamp)[:16]}] {latest_action_log.description[:60]}" if latest_action_log else "No logs"
    })

for r in results:
    print(f"P {r['id']:4d} | {r['name']:<22} | Curr: {r['current_team']:<20} | Base: {r['base_team']:<18}")
    print(f"       Valid TH:  {r['latest_th']}")
    print(f"       Final Log: {r['latest_log']}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
