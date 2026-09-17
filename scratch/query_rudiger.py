import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

script = """
import sys
sys.stdout.reconfigure(encoding='utf-8')
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player

for off in TransferOffer.objects.filter(target_player__name__icontains='Rüdiger').order_by('id'):
    print(f'Offer {off.id} [{off.created_at}]: {off.sender_team.name} -> {off.receiver_team.name} | Status: {off.status} | Type: {off.offer_type} | Cash: {off.cash_amount} | Swaps: {[p.name for p in off.swap_players.all()]}')

for off in TransferOffer.objects.filter(swap_players__name__icontains='Rüdiger').order_by('id'):
    print(f'SWAP in Offer {off.id}: {off.sender_team.name} -> {off.receiver_team.name} | Status: {off.status} | Target: {off.target_player.name if off.target_player else None}')

for th in TransferHistory.objects.filter(player__name__icontains='Rüdiger').order_by('id'):
    print(f'TH {th.id}: {th.seller_team.name if th.seller_team else None} -> {th.buyer_team.name if th.buyer_team else None} | {th.transferred_at}')

for p in Player.objects.filter(name__icontains='Rüdiger'):
    print(f'Player {p.id}: {p.name} | Team: {p.team.name if p.team else None}')
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
