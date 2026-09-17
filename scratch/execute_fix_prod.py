import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

print("Connecting to production server 37.32.36.252...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=20)

# Step 1: Git pull
print("--- 1. Pulling latest git commits on production ---")
stdin, stdout, stderr = client.exec_command("cd /opt/vml && git pull origin main")
git_out = stdout.read().decode('utf-8', errors='replace')
print("Git Output:", git_out)

# Step 2: Fix players based on latest TransferHistory
print("--- 2. Executing transfer corrections on production database ---")
fix_script = """
import sys
sys.stdout.reconfigure(encoding='utf-8')
from decimal import Decimal
from django.db import transaction
from teams.models import Team, Player
from transfers.models import TransferHistory, TransferOffer, TransferLog
from transfers.negotiation_services import ensure_team_starting_eleven

with transaction.atomic():
    updated_players = []
    for p in Player.objects.all():
        latest_th = TransferHistory.objects.filter(player=p).order_by('-transferred_at', '-id').first()
        if latest_th:
            expected_team = latest_th.buyer_team
            if p.team != expected_team:
                old_team_name = p.team.name if p.team else 'Free Agent'
                new_team_name = expected_team.name if expected_team else 'Free Agent'
                
                p.team = expected_team
                p.is_free_agent = (expected_team is None)
                p.is_starting = False
                p.x_coord = 0.0
                p.y_coord = 0.0
                p.pes_transfer_applied = False
                p.save()
                
                updated_players.append({
                    'id': p.id,
                    'name': p.name,
                    'from': old_team_name,
                    'to': new_team_name,
                    'th_id': latest_th.id,
                    'transfer_type': latest_th.transfer_type
                })

    for t in Team.objects.all():
        ensure_team_starting_eleven(t)

    for team in Team.objects.all():
        squad = team.players.all()
        if squad.exists():
            top_11 = sorted([pl.overall for pl in squad], reverse=True)[:11]
            avg_ovr = sum(top_11) / len(top_11)
            stars = round((avg_ovr - 60) / 6.0, 1)
            stars = max(1.0, min(5.0, stars))
            team.star_rating = Decimal(str(stars))
            team.save(update_fields=['star_rating'])

print(f'SUCCESS: Updated {len(updated_players)} players to their latest transfer destination!')
for up in updated_players:
    print(f\"  [UPDATED] {up['name']} (ID {up['id']}): {up['from']} -> {up['to']} (TH {up['th_id']})\")
"""

escaped_fix = fix_script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped_fix}\""
stdin, stdout, stderr = client.exec_command(cmd)
fix_out = stdout.read().decode('utf-8', errors='replace')
print("Fix Output:")
print(fix_out)
err = stderr.read().decode('utf-8', errors='replace')
if err:
    print("Fix Error:", err)

# Step 3: Verify Rudiger specifically
print("--- 3. Verifying Antonio Rüdiger specifically ---")
check_script = """
import sys
sys.stdout.reconfigure(encoding='utf-8')
from teams.models import Player
r = Player.objects.filter(name__icontains='Rüdiger').first() or Player.objects.filter(name__icontains='Rudiger').first()
if r:
    print(f'RUDIGER STATUS: name={r.name}, team={r.team.name if r.team else None}, pes_transfer_applied={r.pes_transfer_applied}')
"""
escaped_check = check_script.replace('"', '\\"')
stdin, stdout, stderr = client.exec_command(f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped_check}\"")
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
print("Done!")
