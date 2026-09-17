import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=20)

script = """
import sys
from transfers.models import TransferOffer, TransferHistory
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

synthetic_ths = TransferHistory.objects.filter(id__gte=592, id__lte=662)
affected_pids = sorted(list(set(synthetic_ths.values_list('player_id', flat=True))))
valid_ths = TransferHistory.objects.exclude(id__gte=592, id__lte=662).order_by('transferred_at', 'id')

changes = []
for pid in affected_pids:
    p = Player.objects.get(id=pid)
    latest_th = valid_ths.filter(player=p).last()
    
    if p.id == 1113: # Rodrygo
        correct_team = Team.objects.filter(name__icontains='Liverpool').first()
        correct_name = correct_team.name
        detail = "Swapped to Liverpool for Salah on Sep 16"
    elif latest_th:
        if latest_th.transfer_type == 'RELEASE' or latest_th.buyer_team is None:
            correct_team = None
            correct_name = "Free Agent (Released)"
            detail = f"Released in TH {latest_th.id} on {str(latest_th.transferred_at)[:10]}"
        else:
            correct_team = latest_th.buyer_team
            correct_name = correct_team.name
            detail = f"TH {latest_th.id} on {str(latest_th.transferred_at)[:10]}: {latest_th.seller_team} -> {latest_th.buyer_team}"
    else:
        correct_team = p.base_team
        correct_name = correct_team.name if correct_team else "Free Agent"
        detail = f"Original base team: {correct_name}"
        
    curr_name = p.team.name if p.team else "Free Agent"
    if curr_name != correct_name:
        changes.append((p.id, p.name, curr_name, correct_name, detail))

print(f"Total affected players needing correction: {len(changes)}")
for c in changes:
    print(f"[{c[0]:4d}] {c[1]:<24} | Current: {c[2]:<22} -> Correct: {c[3]:<22} | {c[4]}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
