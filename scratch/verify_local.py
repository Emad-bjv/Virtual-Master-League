import os, sys
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from teams.models import Player

sys.stdout.reconfigure(encoding='utf-8')
print("--- LOCAL SQLITE VERIFICATION ---")
check_ids = [1213, 1140, 1006, 961, 1113, 249, 714, 1203, 911, 1045, 1208, 1205, 1033]
for p in Player.objects.filter(id__in=check_ids).order_by('name'):
    team_name = p.team.name if p.team else "Free Agent"
    print(f"{p.name:<22} (ID {p.id:4d}): {team_name:<20} | PES Pending = {not p.pes_transfer_applied}")
