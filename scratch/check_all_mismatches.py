import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
import sys
sys.stdout.reconfigure(encoding='utf-8')
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

print('=== PLAYERS WHOSE CURRENT TEAM DOES NOT MATCH THEIR LATEST TRANSFER ===')
mismatches = []
for p in Player.objects.all():
    latest_th = TransferHistory.objects.filter(player=p).order_by('-transferred_at', '-id').first()
    if latest_th:
        expected_team = latest_th.buyer_team
        current_team = p.team
        if expected_team != current_team:
            mismatches.append({
                'player_id': p.id,
                'player_name': p.name,
                'current_team': current_team.name if current_team else 'None',
                'expected_team': expected_team.name if expected_team else 'None (Released)',
                'latest_th_id': latest_th.id,
                'transfer_date': str(latest_th.transferred_at),
                'transfer_type': latest_th.transfer_type,
                'price': str(latest_th.price_usd)
            })

print(f'Total mismatches found: {len(mismatches)}')
for m in mismatches:
    print(f"Player [{m['player_id']}] {m['player_name']}: Current='{m['current_team']}' -> Expected='{m['expected_team']}' (TH {m['latest_th_id']} on {m['transfer_date']} via {m['transfer_type']})")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8', errors='replace'))
err = stderr.read().decode('utf-8', errors='replace')
if err:
    print("STDERR:")
    print(err)
client.close()
