import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from teams.models import Player
from transfers.models import TransferHistory

pids = TransferHistory.objects.filter(id__gte=592, id__lte=662).values_list('player_id', flat=True).distinct()
players = Player.objects.filter(id__in=pids)
applied_count = players.filter(pes_transfer_applied=True).count()
unapplied_count = players.filter(pes_transfer_applied=False).count()
print(f"Total players in TH 592-662: {players.count()}")
print(f"pes_transfer_applied == True: {applied_count}")
print(f"pes_transfer_applied == False: {unapplied_count}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
