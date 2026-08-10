import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player, ClubFacilities

def run():
    teams = Team.objects.all()
    for t in teams:
        if not hasattr(t, 'facilities') or t.facilities is None:
            ClubFacilities.objects.create(team=t)

    print(f"Populated facilities for {teams.count()} teams.")

if __name__ == "__main__":
    run()
