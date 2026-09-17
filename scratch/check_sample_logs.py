import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=20)

script = """
import sys
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

test_names = ['Arda Güler', 'Estêvão', 'Malo Gusto', 'Rodrygo', 'Fabián Ruiz', 'Mohamed Salah', 'Frank Anguissa']

for name in test_names:
    p = Player.objects.filter(name__icontains=name).first()
    if not p:
        continue
    print(f"\\n=== {p.name} (ID: {p.id}) ===")
    print(f"Current DB team: {p.team.name if p.team else 'Free Agent'}")
    
    # Check all logs
    logs = TransferLog.objects.filter(description__icontains=p.name).order_by('timestamp')
    print(f"Logs count: {logs.count()}")
    for l in logs:
        print(f"  Log [{str(l.timestamp)[:19]}] ({l.event_type}): {l.description}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
