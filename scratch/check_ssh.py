import subprocess

script = """
from teams.models import Player, Team
from transfers.models import TransferHistory, TransferLog

print("=== PROD CHECK ===")
r = Player.objects.filter(name__icontains='Rüdiger').first() or Player.objects.filter(name__icontains='Rudiger').first()
if r:
    print(f"RUDIGER: id={r.id}, name={r.name}, team={r.team.name if r.team else 'None'}")
    for th in TransferHistory.objects.filter(player=r):
        print(f"  TH: {th.id} {th.seller_team.name if th.seller_team else 'None'} -> {th.buyer_team.name if th.buyer_team else 'None'} ({th.transferred_at})")

print("--- ALL RECENT TRANSFER HISTORIES ---")
for th in TransferHistory.objects.all().order_by('-transferred_at')[:20]:
    print(f"TH {th.id}: {th.player.name if th.player else 'None'} | {th.seller_team.name if th.seller_team else 'None'} -> {th.buyer_team.name if th.buyer_team else 'None'}")
"""

cmd = [
    "ssh", "ubuntu@37.32.36.252",
    f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{script}\""
]

res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
print("STDOUT:")
print(res.stdout)
print("STDERR:")
print(res.stderr)
