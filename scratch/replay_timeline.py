import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=25)

script = """
import sys
from datetime import datetime, timezone
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

# Cut time: before today 09:00 UTC
cut_time = datetime(2026, 9, 17, 9, 0, 0, tzinfo=timezone.utc)

# Let's collect all events chronologically before cut_time
events = []

# 1. Accepted TransferOffers
for off in TransferOffer.objects.filter(status='ACCEPTED', updated_at__lt=cut_time).select_related('sender_team', 'receiver_team', 'target_player'):
    # Determine buyer and seller
    # In negotiation_services.py:
    # If target player's owner was receiver_team, buyer was sender_team.
    # If counter-offer was sent by receiver, sender was seller and receiver was buyer.
    # We can also check TransferLog for this offer!
    t_log = TransferLog.objects.filter(related_offer=off, event_type='TRANSFER_FINALIZED').first()
    events.append({
        'time': off.updated_at,
        'type': 'OFFER',
        'obj': off,
        'log': t_log
    })

# 2. Player releases
for l in TransferLog.objects.filter(event_type='PLAYER_RELEASED', timestamp__lt=cut_time):
    events.append({
        'time': l.timestamp,
        'type': 'RELEASE',
        'log': l
    })

# 3. Free agent signings
for l in TransferLog.objects.filter(event_type='FREE_AGENT_SIGNED', timestamp__lt=cut_time):
    events.append({
        'time': l.timestamp,
        'type': 'FREE_AGENT',
        'log': l
    })

# Sort all events chronologically
events.sort(key=lambda x: x['time'])
print(f"Total chronological events before 09:00: {len(events)}")

# Let's track player locations
player_teams = {}
for p in Player.objects.all():
    player_teams[p.id] = p.base_team_id

# Replay events
for ev in events:
    if ev['type'] == 'RELEASE':
        # Log: 'تیم Chelsea قرارداد ... را فسخ کرد'
        desc = ev['log'].description or ''
        for pid in player_teams:
            p = Player.objects.get(id=pid)
            if p.name in desc:
                player_teams[pid] = None
                break
    elif ev['type'] == 'FREE_AGENT':
        desc = ev['log'].description or ''
        for pid in player_teams:
            p = Player.objects.get(id=pid)
            if p.name in desc:
                # Find team in desc
                for t in Team.objects.all():
                    if t.name in desc and f"تیم {t.name} بازیکن آزاد" in desc:
                        player_teams[pid] = t.id
                        break
                break
    elif ev['type'] == 'OFFER':
        off = ev['obj']
        # Identify buyer and seller
        tp = off.target_player
        if tp:
            seller_id = player_teams.get(tp.id)
            if seller_id == off.receiver_team_id:
                buyer_id = off.sender_team_id
            elif seller_id == off.sender_team_id:
                buyer_id = off.receiver_team_id
            else:
                # Fallback: check log or default
                buyer_id = off.sender_team_id
                seller_id = off.receiver_team_id
            player_teams[tp.id] = buyer_id
            for sp in off.swap_players.all():
                player_teams[sp.id] = seller_id

# Check known key players
test_pids = [1213, 961, 1113, 1140, 1203, 779, 911, 1045, 1208, 1224, 1190, 933, 1098, 951, 970, 1006]
for pid in test_pids:
    p = Player.objects.get(id=pid)
    tid = player_teams.get(pid)
    t = Team.objects.filter(id=tid).first() if tid else None
    print(f"Replay Player {p.name} ({p.id}): {t.name if t else 'Free Agent'}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
