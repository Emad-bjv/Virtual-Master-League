import os
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team
from matches.models import Tournament, Match, Season
from matches.fixture_engine import generate_league_fixtures
from django.utils import timezone

def test_fixture_generation():
    print("=== Test Fixture Generation (Task B) ===")
    season = Season.objects.create(name="Test Season")
    tournament_even = Tournament.objects.create(name="Test League 8 Teams", tournament_type='LEAGUE', season=season)
    tournament_odd = Tournament.objects.create(name="Test League 7 Teams", tournament_type='LEAGUE', season=season)
    
    # Create 8 teams
    teams = [Team.objects.create(name=f"Team {i}", budget=1000, gems=0) for i in range(1, 9)]
    
    # Test 8 teams
    start_date = timezone.now()
    count_even = generate_league_fixtures(tournament_even, teams, start_date)
    print(f"8 Teams -> Expected 56 matches. Got: {count_even}")
    if count_even == 56:
        print("Pass: Correct number of matches for even teams.")
    else:
        print("Fail: Incorrect number of matches for even teams.")
        
    # Test no team plays twice in same week
    matches = Match.objects.filter(tournament=tournament_even)
    passed_no_double = True
    for week in range(1, 15):
        week_matches = matches.filter(round_name=f"هفته {week}")
        teams_this_week = set()
        for m in week_matches:
            if m.home_team in teams_this_week or m.away_team in teams_this_week:
                passed_no_double = False
                print(f"Fail: Duplicate team found in week {week}")
                break
            teams_this_week.add(m.home_team)
            teams_this_week.add(m.away_team)
    if passed_no_double:
        print("Pass: No team plays twice in the same week.")
        
    # Test 7 teams
    count_odd = generate_league_fixtures(tournament_odd, teams[:7], start_date)
    print(f"7 Teams -> Expected 42 matches (7 * 6). Got: {count_odd}")
    if count_odd == 42:
        print("Pass: Correct number of matches for odd teams (bye week handled gracefully).")
    else:
        print("Fail: Incorrect number of matches for odd teams.")

if __name__ == '__main__':
    test_fixture_generation()
