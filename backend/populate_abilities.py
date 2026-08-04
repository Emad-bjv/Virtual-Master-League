import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player, PlayerAbilities, ClubFacilities

def run():
    teams = Team.objects.all()
    for t in teams:
        if not hasattr(t, 'facilities') or t.facilities is None:
            ClubFacilities.objects.create(team=t)

    players = Player.objects.all()
    for p in players:
        if not hasattr(p, 'abilities') or p.abilities is None:
            PlayerAbilities.objects.create(player=p)

    print(f"Populated facilities for {teams.count()} teams and abilities for {players.count()} players.")

if __name__ == "__main__":
    run()
