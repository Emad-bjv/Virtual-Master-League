import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=20)

script = """
import sys, json
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

# Exclude synthetic THs 592..662
valid_ths = TransferHistory.objects.exclude(id__gte=592, id__lte=662).order_by('transferred_at', 'id')

# All players in the database
players = Player.objects.all().order_by('id')

# List of players whose latest valid TH points to a team different from their current team
discrepancies = []

for p in players:
    # Exceptions handled explicitly:
    # 1. Rudiger (1140): latest TH 504 -> Liverpool.
    # 2. Salah (961): latest valid TH 590 -> Real Madrid.
    # 3. Rodrygo (1113): swapped to Liverpool in the Salah deal on Sep 16!
    # 4. Malen (249): TH 663 -> AS Roma.
    # 5. Modric (714): TH 664 -> AC Milan.
    
    # Get all valid THs for this player
    p_ths = valid_ths.filter(player=p)
    latest_th = p_ths.last()
    
    expected_team = None
    expected_team_name = "Free Agent"
    reason = "No transfers (Base Squad)"
    
    if p.id == 1113: # Rodrygo
        expected_team = Team.objects.filter(name__icontains='Liverpool').first()
        expected_team_name = expected_team.name if expected_team else "Liverpool"
        reason = "Swapped to Liverpool for Salah on Sep 16"
    elif latest_th:
        if latest_th.transfer_type == 'RELEASE' or latest_th.buyer_team is None:
            expected_team = None
            expected_team_name = "Free Agent (Released)"
            reason = f"TH {latest_th.id} [{str(latest_th.transferred_at)[:10]}]: Released"
        else:
            expected_team = latest_th.buyer_team
            expected_team_name = expected_team.name
            reason = f"TH {latest_th.id} [{str(latest_th.transferred_at)[:10]}]: {latest_th.seller_team} -> {latest_th.buyer_team}"
    else:
        # No TH at all: player was never transferred, should be at base_team
        expected_team = p.base_team
        expected_team_name = expected_team.name if expected_team else "No Base Team"
        reason = "Original base squad (never transferred)"
    
    curr_team_id = p.team_id
    exp_team_id = expected_team.id if expected_team else None
    
    if curr_team_id != exp_team_id:
        discrepancies.append({
            'player_id': p.id,
            'name': p.name,
            'current_team': p.team.name if p.team else 'Free Agent',
            'expected_team': expected_team_name,
            'reason': reason
        })

print(f"Total discrepancies found: {len(discrepancies)}")
for d in discrepancies:
    print(f"[{d['player_id']:4d}] {d['name']:<24} | Current: {d['current_team']:<20} -> Correct: {d['expected_team']:<20} | ({d['reason']})")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
