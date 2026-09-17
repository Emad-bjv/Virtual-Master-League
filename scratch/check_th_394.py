import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from transfers.models import TransferHistory
for tid in [394, 621, 622]:
    th = TransferHistory.objects.filter(id=tid).first()
    if th:
        print(f"TH {th.id} [{th.transferred_at}]: {th.player.name if th.player else None} | {th.seller_team} -> {th.buyer_team} | {th.transfer_type}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
