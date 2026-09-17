import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from teams.models import Player
from transfers.models import TransferHistory

for name in ['Anguissa', 'Rüdiger', 'Doku', 'Salah', 'Rodrygo']:
    p = Player.objects.filter(name__icontains=name).first()
    print(f"{p.name} (ID {p.id}): Team = {p.team.name if p.team else 'Free Agent'} | PES Pending = {not p.pes_transfer_applied}")
    latest_th = TransferHistory.objects.filter(player=p).order_by('-transferred_at', '-id').first()
    if latest_th:
        print(f"   Latest TH: {latest_th.seller_team.name if latest_th.seller_team else 'None'} -> {latest_th.buyer_team.name if latest_th.buyer_team else 'Free Agent'} [{latest_th.transferred_at}]")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
