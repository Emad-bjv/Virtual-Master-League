import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
import sys
sys.stdout.reconfigure(encoding='utf-8')
from transfers.models import TransferHistory

print('--- All TransferHistory records with ID >= 590 ---')
for th in TransferHistory.objects.filter(id__gte=590).order_by('id'):
    print(f'TH {th.id} [{th.transferred_at}]: Player={th.player.name if th.player else None} ({th.player_id}) | {th.seller_team.name if th.seller_team else None} -> {th.buyer_team.name if th.buyer_team else None} | Fee={th.price_usd} | Type={th.transfer_type}')
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
