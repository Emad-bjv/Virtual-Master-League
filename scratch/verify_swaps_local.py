import os, sys
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from teams.models import Player

sys.stdout.reconfigure(encoding='utf-8')
print("=== VERIFYING SWAP PLAYERS LOCALLY ===")
ids = [841, 1116, 1112, 1118, 1144, 1105, 1021, 1020, 1029, 1025, 1215, 1066, 1058]
for p in Player.objects.filter(id__in=ids).order_by('name'):
    team_name = p.team.name if p.team else "Free Agent"
    print(f"{p.name:<24} (ID {p.id:4d}) -> {team_name}")
