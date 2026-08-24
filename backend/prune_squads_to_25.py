import os
import sys
import django

sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player

def prune_all_teams_to_25():
    print("--- PRUNING ALL SQUADS TO MAXIMUM 25 PLAYERS ---")
    teams = Team.objects.all().order_by('name')
    total_pruned = 0
    for team in teams:
        count = team.players.count()
        if count > 25:
            excess = count - 25
            # Select lowest overall players from bench (is_starting=False) first
            bench_lowest = list(team.players.filter(is_starting=False).order_by('overall', 'potential_ovr')[:excess])
            if len(bench_lowest) < excess:
                needed = excess - len(bench_lowest)
                bench_ids = [p.id for p in bench_lowest]
                more = list(team.players.exclude(id__in=bench_ids).order_by('overall', 'potential_ovr')[:needed])
                to_delete = bench_lowest + more
            else:
                to_delete = bench_lowest

            deleted_info = []
            for p in to_delete:
                deleted_info.append(f"{p.name} [OVR: {p.overall}]")
                p.delete()
                total_pruned += 1

            # Recalculate star rating
            team.update_star_rating(save=True)
            print(f"✅ {team.name}: Removed {len(to_delete)} players -> {', '.join(deleted_info)} | New squad size: {team.players.count()}")
        else:
            print(f"ℹ️ {team.name}: Current squad size is {count} (<= 25).")

    print(f"\nCompleted! Total players pruned across all clubs: {total_pruned}")

if __name__ == '__main__':
    prune_all_teams_to_25()
