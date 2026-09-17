import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from datetime import datetime, timezone
from transfers.models import TransferHistory

recent_valid = TransferHistory.objects.filter(
    transferred_at__gte=datetime(2026, 9, 11, tzinfo=timezone.utc)
).exclude(
    id__gte=592, id__lte=662
).order_by('transferred_at', 'id')

print(f"Total valid recent transfers since Sep 11: {recent_valid.count()}")
for th in recent_valid:
    print(f"TH {th.id} [{th.transferred_at}]: {th.player.name if th.player else 'None'} ({th.player_id}) | {th.seller_team} -> {th.buyer_team} | {th.transfer_type}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
