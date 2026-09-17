import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from datetime import datetime, timezone
from transfers.models import TransferHistory

# Use .update() to bypass auto_now_add!
TransferHistory.objects.filter(id=665).update(transferred_at=datetime(2026, 9, 16, 6, 28, 59, tzinfo=timezone.utc))
TransferHistory.objects.filter(id=666).update(transferred_at=datetime(2026, 9, 14, 8, 46, 49, tzinfo=timezone.utc))
TransferHistory.objects.filter(id=667).update(transferred_at=datetime(2026, 8, 29, 21, 24, 44, tzinfo=timezone.utc))
TransferHistory.objects.filter(id=668).update(transferred_at=datetime(2026, 8, 28, 15, 7, 18, tzinfo=timezone.utc))

for tid in [665, 666, 667, 668]:
    th = TransferHistory.objects.get(id=tid)
    print(f"TH {th.id}: {th.player.name} | {th.seller_team} -> {th.buyer_team} | {th.transferred_at}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
