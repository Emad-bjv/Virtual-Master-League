import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=25)

script = """
import sys
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

swap_offers = TransferOffer.objects.filter(status='ACCEPTED', offer_type='SWAP').order_by('updated_at')
print(f"Total accepted swap offers: {swap_offers.count()}")

all_swap_moves = []
for off in swap_offers:
    tp = off.target_player
    # Find who owned tp before this offer
    # We can check the TransferLog for this offer
    log = TransferLog.objects.filter(related_offer=off, event_type='TRANSFER_FINALIZED').first()
    desc = log.description if log else ""
    
    # Target player: moves to buyer
    # Swap players: move to seller
    # In desc: 'انتقال رسمی: {tp.name} با مبلغ ... از {seller} به تیم {buyer} پیوست.'
    seller_name = None
    buyer_name = None
    for t in Team.objects.all():
        if f"از {t.name} به تیم" in desc:
            seller_name = t.name
        if f"به تیم {t.name} پیوست" in desc:
            buyer_name = t.name
            
    # If not found in log desc, use sender/receiver
    if not seller_name or not buyer_name:
        seller_name = off.receiver_team.name
        buyer_name = off.sender_team.name
        
    s_team = Team.objects.filter(name=seller_name).first()
    b_team = Team.objects.filter(name=buyer_name).first()
    
    for sp in off.swap_players.all():
        all_swap_moves.append({
            'offer_id': off.id,
            'date': off.updated_at,
            'player': sp,
            'from_team': b_team, # buyer sends swap player
            'to_team': s_team,   # to seller
            'target_player': tp
        })

print(f"\\nTotal swap player transactions: {len(all_swap_moves)}")

# Group by player and find their LATEST swap move
latest_swap_by_player = {}
for m in all_swap_moves:
    latest_swap_by_player[m['player'].id] = m

print("\\n=== LATEST SWAP DESTINATION FOR ALL SWAP PLAYERS ===")
for pid, m in sorted(latest_swap_by_player.items(), key=lambda x: x[1]['date']):
    p = m['player']
    # Check if they had subsequent non-swap transfers after m['date']
    later_th = TransferHistory.objects.filter(player=p, transferred_at__gt=m['date']).order_by('transferred_at').last()
    print(f"Player {p.name:<22} (ID {p.id:4d}) on {str(m['date'])[:10]}: {m['from_team'].name if m['from_team'] else 'None'} -> {m['to_team'].name if m['to_team'] else 'None'}")
    if later_th:
        print(f"   --> Later move in TH {later_th.id} on {str(later_th.transferred_at)[:10]}: {later_th.seller_team} -> {later_th.buyer_team} ({later_th.transfer_type})")
    else:
        print(f"   --> No later moves! CURRENT DB TEAM: {p.team.name if p.team else 'Free Agent'}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
