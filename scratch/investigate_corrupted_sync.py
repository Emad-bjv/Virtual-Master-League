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

ths = TransferHistory.objects.filter(id__gte=592, id__lte=662).order_by('id')
print(f"Total synthetic TH records created at 09:12: {ths.count()}")

# For each, let's see why it was created and if an earlier TH exists for that exact move or offer
for th in ths:
    p = th.player
    s = th.seller_team
    b = th.buyer_team
    earlier_ths = TransferHistory.objects.filter(player=p, id__lt=592).order_by('id')
    
    # Check if this exact move existed earlier
    exact_match = earlier_ths.filter(seller_team=s, buyer_team=b).first()
    
    # Check what the real latest move was before 592
    real_latest = earlier_ths.last()
    
    print(f"TH {th.id}: {p.name if p else 'None'} ({th.player_id}) | {s.name if s else 'None'} -> {b.name if b else 'None'} ({th.transfer_type})")
    if exact_match:
        print(f"   -> DUPLICATE of earlier TH {exact_match.id} [{exact_match.transferred_at}]: {exact_match.seller_team} -> {exact_match.buyer_team}")
    if real_latest:
        print(f"   -> Real pre-592 latest TH {real_latest.id} [{real_latest.transferred_at}]: {real_latest.seller_team} -> {real_latest.buyer_team}")
    else:
        print(f"   -> No pre-592 TH (was at base team)")
    print(f"   -> Current player.team in DB: {p.team.name if p and p.team else 'None'}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
