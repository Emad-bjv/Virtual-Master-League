import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
from teams.models import Player
from transfers.models import TransferOffer, TransferHistory, TransferLog

alaba = Player.objects.get(id=1138)
print(f"Alaba ID: {alaba.id}, Name: {alaba.name}, Base Team: {alaba.base_team.name if alaba.base_team else None}, Team: {alaba.team.name if alaba.team else None}")
print("Offers:")
for off in TransferOffer.objects.filter(target_player=alaba):
    print(f"  Target in Offer {off.id} [{off.status}]: {off.sender_team} -> {off.receiver_team}")
for off in TransferOffer.objects.filter(swap_players=alaba):
    print(f"  Swap in Offer {off.id} [{off.status}]: {off.sender_team} -> {off.receiver_team} | target: {off.target_player.name if off.target_player else None}")
print("THs:")
for th in TransferHistory.objects.filter(player=alaba):
    print(f"  TH {th.id} [{th.transferred_at}]: {th.seller_team} -> {th.buyer_team}")
print("Logs:")
for l in TransferLog.objects.filter(description__icontains='Alaba'):
    print(f"  Log {l.id} [{l.timestamp}]: {l.description}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
