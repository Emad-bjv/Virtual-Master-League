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

# Find all players that were in TH 592..662
synthetic_ths = TransferHistory.objects.filter(id__gte=592, id__lte=662)
player_ids = sorted(list(set(synthetic_ths.values_list('player_id', flat=True))))

print(f"Analyzing {len(player_ids)} players touched by synthetic transfers...")

mismatches = []
for pid in player_ids:
    p = Player.objects.get(id=pid)
    
    # Latest valid pre-592 TH (or 663, 664)
    valid_ths = TransferHistory.objects.filter(player=p).exclude(id__gte=592, id__lte=662).order_by('transferred_at', 'id')
    latest_th = valid_ths.last()
    
    th_dest = latest_th.buyer_team if latest_th else None
    
    # Check if latest valid TH was a release
    is_released = (latest_th and latest_th.transfer_type == 'RELEASE') or (latest_th and latest_th.buyer_team is None)
    expected_team_by_th = None if is_released else th_dest
    
    curr_team = p.team
    
    # Check if mismatch
    # Note: if player had NO TH at all, their base team is what they had initially.
    # But if synthetic TH changed p.team, what was p's base team?
    print(f"P {p.id:4d} | {p.name:<25} | DB Team: {curr_team.name if curr_team else 'FA':<22} | Latest Valid TH ({latest_th.id if latest_th else 'None'} on {str(latest_th.transferred_at)[:16] if latest_th else ''}): {latest_th.seller_team.name if latest_th and latest_th.seller_team else 'None'} -> {latest_th.buyer_team.name if latest_th and latest_th.buyer_team else 'None'} ({latest_th.transfer_type if latest_th else ''})")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
