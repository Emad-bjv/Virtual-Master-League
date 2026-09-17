import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
import sys
sys.stdout.reconfigure(encoding='utf-8')
from transfers.models import TransferHistory
from teams.models import Player

mismatches = 0
for p in Player.objects.all():
    latest_th = TransferHistory.objects.filter(player=p).order_by('-transferred_at', '-id').first()
    if latest_th:
        if p.team != latest_th.buyer_team:
            mismatches += 1
            print(f'MISMATCH: {p.name} - current: {p.team} vs expected: {latest_th.buyer_team}')

print(f'TOTAL REMAINING MISMATCHES ON PROD: {mismatches}')
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
