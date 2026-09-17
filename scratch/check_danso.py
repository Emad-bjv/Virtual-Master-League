import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from teams.models import Player
from transfers.models import TransferOffer, TransferHistory, TransferLog

danso = Player.objects.filter(name__icontains='Danso').first()
print(f"Danso: {danso.name} (ID {danso.id}), Base: {danso.base_team.name if danso.base_team else None}, Curr: {danso.team.name if danso.team else None}")
for l in TransferLog.objects.filter(description__icontains='Danso')[:10]:
    print(f"  Log {l.id} [{l.timestamp}]: {l.description}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
