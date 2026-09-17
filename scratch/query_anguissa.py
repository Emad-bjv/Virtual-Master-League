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

for p in Player.objects.filter(name__icontains='Anguissa'):
    print(f'Player ID: {p.id}, Name: {p.name}, Team: {p.team.name if p.team else None}')
    print('  --- TransferHistory records (ordered by transferred_at): ---')
    for th in TransferHistory.objects.filter(player=p).order_by('transferred_at', 'id'):
        print(f'    TH {th.id} [{th.transferred_at}]: {th.seller_team.name if th.seller_team else None} -> {th.buyer_team.name if th.buyer_team else None} | Fee: {th.price_usd} | Type: {th.transfer_type}')

print('--- OFFERS involving Anguissa ---')
for off in TransferOffer.objects.filter(target_player__name__icontains='Anguissa').order_by('id'):
    print(f'  Target in Offer {off.id} [{off.created_at}]: {off.sender_team.name} -> {off.receiver_team.name} | Status: {off.status} | Type: {off.offer_type}')
for off in TransferOffer.objects.filter(swap_players__name__icontains='Anguissa').order_by('id'):
    print(f'  SWAP in Offer {off.id} [{off.created_at}]: {off.sender_team.name} -> {off.receiver_team.name} | Status: {off.status} | Target: {off.target_player.name if off.target_player else None}')

print('--- LOGS mentioning Anguissa ---')
for l in TransferLog.objects.filter(description__icontains='Anguissa').order_by('timestamp')[:15]:
    print(f'  Log {l.id} [{l.timestamp}]: {l.description}')
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
