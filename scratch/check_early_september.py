import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=20)

script = """
import sys
from transfers.models import TransferOffer, TransferLog

sys.stdout.reconfigure(encoding='utf-8')

print("=== OFFERS BETWEEN SEP 11 00:00 AND SEP 12 08:00 ===")
for off in TransferOffer.objects.filter(status='ACCEPTED', updated_at__gte='2026-09-11', updated_at__lte='2026-09-12 08:00').order_by('updated_at'):
    logs = list(TransferLog.objects.filter(related_offer=off))
    swaps = [p.name for p in off.swap_players.all()]
    print(f"\\nOffer {off.id} [{off.updated_at}]: Type={off.offer_type} | Target={off.target_player.name if off.target_player else 'None'} | Swaps={swaps}")
    print(f"   Sender: {off.sender_team.name} | Receiver: {off.receiver_team.name}")
    for l in logs:
        print(f"   Log: {l.description}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
