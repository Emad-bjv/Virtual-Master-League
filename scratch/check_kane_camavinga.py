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

for name in ['Kane', 'Camavinga']:
    p = Player.objects.filter(name__icontains=name).first()
    print(f"\\n================ {p.name} (ID: {p.id}) ================")
    print(f"Current Team in DB: {p.team.name if p.team else 'Free Agent'}")
    print(f"Base Team: {p.base_team.name if p.base_team else 'None'}")
    
    print("\\n--- ALL TransferHistory records ---")
    for th in TransferHistory.objects.filter(player=p).order_by('transferred_at', 'id'):
        print(f"  TH {th.id} [{th.transferred_at}]: {th.seller_team} -> {th.buyer_team} ({th.transfer_type}) | fee: {th.price_usd}")
        
    print("\\n--- ALL ACCEPTED Offers where Target ---")
    for off in TransferOffer.objects.filter(target_player=p, status='ACCEPTED').order_by('updated_at'):
        print(f"  Target in Offer {off.id} [{off.updated_at}]: {off.sender_team} -> {off.receiver_team} | type: {off.offer_type} | cash: {off.cash_amount} | swaps: {[sp.name for sp in off.swap_players.all()]}")
        
    print("\\n--- ALL ACCEPTED Offers where Swap ---")
    for off in TransferOffer.objects.filter(swap_players=p, status='ACCEPTED').order_by('updated_at'):
        print(f"  Swap in Offer {off.id} [{off.updated_at}]: {off.sender_team} -> {off.receiver_team} | target: {off.target_player.name if off.target_player else 'None'} | cash: {off.cash_amount}")
        
    print("\\n--- ALL LOGS in September (Sep 11 onwards) ---")
    for l in TransferLog.objects.filter(description__icontains=p.name, timestamp__gte='2026-09-01').order_by('timestamp'):
        print(f"  Log {l.id} [{l.timestamp}] ({l.event_type}): {l.description}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
