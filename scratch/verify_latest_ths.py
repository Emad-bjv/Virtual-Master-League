import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from transfers.models import TransferHistory

print("=== 15 LATEST TRANSFERS IN THE LEAGUE ===")
for th in TransferHistory.objects.all().order_by('-transferred_at', '-id')[:15]:
    p_name = th.player.name if th.player else 'None'
    s_name = th.seller_team.name if th.seller_team else 'None'
    b_name = th.buyer_team.name if th.buyer_team else 'Free Agent'
    print(f"TH {th.id} [{str(th.transferred_at)[:19]}]: {p_name} | {s_name} -> {b_name} | {th.transfer_type}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
