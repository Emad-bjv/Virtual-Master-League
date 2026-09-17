import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=20)

script = """
import sys, json
from decimal import Decimal
from django.db.models import Max
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

# 1. Inspect TH >= 600
th_recent = TransferHistory.objects.filter(id__gte=600).order_by('id')
print(f"Total TH records with ID >= 600: {th_recent.count()}")

affected_player_ids = set(th_recent.values_list('player_id', flat=True))
print(f"Total distinct players touched by TH >= 600: {len(affected_player_ids)}")

# 2. For each player touched by TH >= 600, let's analyze their timeline
print("\\n================ AFFECTED PLAYERS BREAKDOWN ================")
for pid in sorted(affected_player_ids):
    p = Player.objects.filter(id=pid).first()
    if not p:
        print(f"Player {pid} not found!")
        continue
    
    # All transfer histories before 600
    ths_pre = list(TransferHistory.objects.filter(player=p, id__lt=600).order_by('transferred_at', 'id'))
    latest_pre = ths_pre[-1] if ths_pre else None
    
    # All transfer histories >= 600
    ths_post = list(TransferHistory.objects.filter(player=p, id__gte=600).order_by('id'))
    
    # Latest accepted offer chronologically
    acc_offers = list(TransferOffer.objects.filter(
        status='ACCEPTED'
    ).filter(
        target_player=p
    ).order_by('updated_at', 'id'))
    
    # Also check if they were a swap player in any accepted offer
    swap_offers = list(TransferOffer.objects.filter(
        status='ACCEPTED',
        swap_players=p
    ).order_by('updated_at', 'id'))
    
    print(f"\\n--- Player: {p.name} (ID: {p.id}) | Current Team: {p.team.name if p.team else 'Free Agent'} ---")
    if latest_pre:
        print(f"  Latest PRE-600 TH: ID={latest_pre.id} on {latest_pre.transferred_at}: {latest_pre.seller_team.name if latest_pre.seller_team else None} -> {latest_pre.buyer_team.name if latest_pre.buyer_team else None} ({latest_pre.transfer_type})")
    else:
        print(f"  No PRE-600 TH (original squad player)")
    
    for th in ths_post:
        print(f"  POST-600 TH: ID={th.id} on {th.transferred_at}: {th.seller_team.name if th.seller_team else None} -> {th.buyer_team.name if th.buyer_team else None} ({th.transfer_type})")

"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print(out)
if err:
    print("STDERR:", err)
client.close()
