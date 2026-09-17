import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player

for name in ['Vinícius', 'Doku']:
    p = Player.objects.filter(name__icontains=name).first()
    print(f"\\n=== {p.name} (ID {p.id}) Current Team: {p.team.name if p.team else None} ===")
    for th in TransferHistory.objects.filter(player=p).order_by('id'):
        print(f"  TH {th.id} [{th.transferred_at}]: {th.seller_team} -> {th.buyer_team}")
    for l in TransferLog.objects.filter(description__icontains=p.name)[:6]:
        print(f"  Log {l.id} [{l.timestamp}]: {l.description}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
