import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=15)

py_script = """
import sys
sys.stdout.reconfigure(encoding='utf-8')
from teams.models import Player, Team
from transfers.models import TransferHistory, TransferLog, TransferOffer

print('=== PROD PLAYERS CHECK ===')
for p in Player.objects.filter(name__icontains='Rüdiger') | Player.objects.filter(name__icontains='Rudiger'):
    print(f'RUDIGER: id={p.id} name={p.name} team={p.team.name if p.team else None} pes_applied={p.pes_transfer_applied}')
    for th in TransferHistory.objects.filter(player=p):
        print(f'  TH: {th.id} {th.seller_team.name if th.seller_team else None} -> {th.buyer_team.name if th.buyer_team else None} ({th.price_usd})')

print('--- ALL TRANSFER HISTORIES ---')
for th in TransferHistory.objects.all().order_by('-transferred_at')[:30]:
    print(f'TH {th.id}: {th.player.name if th.player else None} | {th.seller_team.name if th.seller_team else None} -> {th.buyer_team.name if th.buyer_team else None} | {th.price_usd} | {th.transfer_type}')

print('--- ALL TRANSFER LOGS ---')
for tl in TransferLog.objects.all().order_by('-timestamp')[:20]:
    print(f'TL {tl.id}: {tl.timestamp} | {tl.event_type} | {tl.description}')

print('--- ALL ACCEPTED OFFERS ---')
for off in TransferOffer.objects.filter(status='ACCEPTED'):
    print(f'Offer {off.id}: {off.sender_team.name} -> {off.receiver_team.name} Target: {off.target_player.name if off.target_player else None} Swaps: {[p.name for p in off.swap_players.all()]}')
"""

escaped_script = py_script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped_script}\""

stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

print("OUT:")
print(out)
if err:
    print("ERR:")
    print(err)

client.close()
