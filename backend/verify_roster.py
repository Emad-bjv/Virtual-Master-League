import os
import sys
import django

sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player

def check():
    teams = Team.objects.all()
    print(f"Total Teams in Database: {teams.count()}")
    for t in teams:
        starters = list(Player.objects.filter(team=t, is_starting=True))
        bench = list(Player.objects.filter(team=t, is_starting=False).order_by('-overall'))
        print(f"\n[{t.name}] — Formation: {t.default_formation}")
        print(f"  Starting XI ({len(starters)} players):")
        for p in starters:
            print(f"    - #{p.shirt_number} {p.name} [{p.position}] (OVR {p.overall}) -> Slot ({p.x_coord}%, {p.y_coord}%)")
        print(f"  Substitutes / Bench ({len(bench[:11])} players):")
        for p in bench[:11]:
            print(f"    - #{p.shirt_number} {p.name} [{p.position}] (OVR {p.overall})")
        print(f"  Reserves ({len(bench[11:])} players):")
        for p in bench[11:]:
            print(f"    - #{p.shirt_number} {p.name} [{p.position}] (OVR {p.overall})")

if __name__ == '__main__':
    check()
