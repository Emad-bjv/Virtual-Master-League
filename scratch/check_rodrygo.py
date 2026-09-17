import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from transfers.models import TransferHistory, TransferOffer, TransferLog
from teams.models import Player

rodrygo = Player.objects.filter(name__icontains='Rodrygo').first()
if rodrygo:
    print(f"Rodrygo ID: {rodrygo.id}, current team: {rodrygo.team.name if rodrygo.team else 'None'}")
    print("THs:")
    for th in TransferHistory.objects.filter(player=rodrygo).order_by('id'):
        print(f"  TH {th.id} [{th.transferred_at}]: {th.seller_team} -> {th.buyer_team} ({th.transfer_type})")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
