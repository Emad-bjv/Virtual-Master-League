import os, sys
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from teams.models import Team, Player

sys.stdout.reconfigure(encoding='utf-8')
print("=== TEAM SQUADS OVERVIEW ===")
for t in Team.objects.all().order_by('name'):
    players = t.players.all().order_by('-overall')
    print(f"\\n--- {t.name} (Total: {players.count()}) ---")
    top_players = [f"{p.name} ({p.overall})" for p in players[:10]]
    print("   " + ", ".join(top_players))
