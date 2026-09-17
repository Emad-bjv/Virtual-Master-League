import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from transfers.models import TransferHistory, TransferLog
for th_id in [663, 664]:
    th = TransferHistory.objects.filter(id=th_id).first()
    if th:
        print(f"TH {th.id}: [{th.transferred_at}] {th.player.name if th.player else None} | {th.seller_team} -> {th.buyer_team} | {th.transfer_type} | price: {th.price_usd}")
        logs = TransferLog.objects.filter(description__icontains=th.player.name if th.player else "XYZ").order_by('-id')[:3]
        for l in logs:
            print(f"   Log {l.id} [{l.timestamp}]: {l.description}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
