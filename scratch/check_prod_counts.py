import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
import sys
sys.stdout.reconfigure(encoding='utf-8')
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

print(f"Total Players: {Player.objects.count()}")
print(f"Total TransferHistory: {TransferHistory.objects.count()}")
print(f"Total TransferLog: {TransferLog.objects.count()}")
print(f"Total TransferOffers: {TransferOffer.objects.count()}")
print(f"Accepted TransferOffers: {TransferOffer.objects.filter(status='ACCEPTED').count()}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print("STDOUT:")
print(stdout.read().decode('utf-8', errors='replace'))
err = stderr.read().decode('utf-8', errors='replace')
if err:
    print("STDERR:")
    print(err)
client.close()
