import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=25)

script = """
import sys, json
from datetime import datetime, timezone
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

# Let's track every player's team by sequentially applying:
# 1. Base team (initial)
# 2. All accepted TransferOffers (both target AND swap players!)
# 3. Free agent signings
# 4. Releases
# 5. Direct TransferHistory entries (PERMANENT / DIRECT) that happened outside offers

# Step 1: Initialize
player_teams = {}
for p in Player.objects.all():
    player_teams[p.id] = p.base_team_id

# Step 2: Build a master event list
events = []

# All accepted offers
for off in TransferOffer.objects.filter(status='ACCEPTED').select_related('sender_team', 'receiver_team', 'target_player'):
    # Determine buyer and seller
    # The owner of target_player is SELLER
    # The other team is BUYER
    # In negotiation_services.py:
    # seller = target_p.team
    # buyer = sender if receiver == seller else receiver
    events.append({
        'time': off.updated_at,
        'type': 'OFFER',
        'id': off.id,
        'obj': off
    })

# Releases from TransferHistory or TransferLog
for th in TransferHistory.objects.filter(transfer_type='RELEASE'):
    events.append({
        'time': th.transferred_at,
        'type': 'RELEASE',
        'player_id': th.player_id,
        'id': th.id
    })

# Free agent signings
for th in TransferHistory.objects.filter(transfer_type='FREE_AGENT'):
    events.append({
        'time': th.transferred_at,
        'type': 'FREE_AGENT',
        'player_id': th.player_id,
        'team_id': th.buyer_team_id,
        'id': th.id
    })

# Sort chronologically
events.sort(key=lambda x: x['time'])

print(f"Total chronological events: {len(events)}")

# Replay
for ev in events:
    if ev['type'] == 'RELEASE':
        player_teams[ev['player_id']] = None
    elif ev['type'] == 'FREE_AGENT':
        player_teams[ev['player_id']] = ev['team_id']
    elif ev['type'] == 'OFFER':
        off = ev['obj']
        tp = off.target_player
        if tp:
            current_owner = player_teams.get(tp.id)
            if current_owner == off.receiver_team_id:
                seller_id = off.receiver_team_id
                buyer_id = off.sender_team_id
            elif current_owner == off.sender_team_id:
                seller_id = off.sender_team_id
                buyer_id = off.receiver_team_id
            else:
                # If neither matches current owner (e.g. initial mismatch), use receiver as seller
                seller_id = off.receiver_team_id
                buyer_id = off.sender_team_id
                
            # Move target player to buyer
            player_teams[tp.id] = buyer_id
            
            # Move swap players to seller
            for sp in off.swap_players.all():
                player_teams[sp.id] = seller_id

# Let's inspect all players whose replayed team is different from current DB team
mismatches = []
for p in Player.objects.all():
    replayed_tid = player_teams.get(p.id)
    curr_tid = p.team_id
    if replayed_tid != curr_tid:
        r_team = Team.objects.filter(id=replayed_tid).first()
        c_team = p.team
        mismatches.append({
            'id': p.id,
            'name': p.name,
            'current': c_team.name if c_team else 'Free Agent',
            'should_be': r_team.name if r_team else 'Free Agent',
        })

print(f"\\nTotal mismatches between current DB and full chronological replay: {len(mismatches)}")
for m in mismatches:
    print(f"[{m['id']:4d}] {m['name']:<24} | Current: {m['current']:<20} -> Real: {m['should_be']:<20}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
