from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from .models import Match

def generate_league_fixtures(tournament, teams, start_date, days_between_rounds=7):
    """
    Generates a full round-robin schedule (home and away) for the given teams.
    Uses the Circle Method.
    Supports odd number of teams by using a 'bye' team.
    Returns the number of matches created.
    """
    if len(teams) < 2:
        return 0

    team_list = list(teams)
    
    # If odd number of teams, add a dummy "bye" team
    if len(team_list) % 2 != 0:
        team_list.append(None)
        
    num_teams = len(team_list)
    num_rounds = num_teams - 1
    half_size = num_teams // 2
    
    matches_to_create = []
    
    with transaction.atomic():
        # Generate both halves of the season
        for half in [1, 2]:
            for round_num in range(num_rounds):
                # Calculate actual week number (1 to 2 * num_rounds)
                week_number = (half - 1) * num_rounds + round_num + 1
                match_date = start_date + timedelta(days=(week_number - 1) * days_between_rounds)
                round_name = f"هفته {week_number}"
                
                for i in range(half_size):
                    team1 = team_list[i]
                    team2 = team_list[num_teams - 1 - i]
                    
                    # Skip if one of the teams is the "bye" dummy team
                    if team1 is None or team2 is None:
                        continue
                        
                    # Decide home and away. 
                    # In half 1: team1 is home, team2 is away (for even round_num, else swap to balance)
                    # In half 2: swap the home/away from half 1
                    
                    # A standard trick to balance home/away in circle method:
                    # if i == 0 and round_num % 2 == 1: swap
                    # else if i != 0 and round_num % 2 == 0: swap
                    
                    swap = False
                    if i == 0:
                        if round_num % 2 == 1:
                            swap = True
                    else:
                        if round_num % 2 == 0:
                            swap = True
                            
                    if half == 2:
                        swap = not swap
                        
                    home_team = team2 if swap else team1
                    away_team = team1 if swap else team2
                    
                    match = Match(
                        tournament=tournament,
                        home_team=home_team,
                        away_team=away_team,
                        date=match_date,
                        round_name=round_name,
                        status='SCHEDULED',
                        is_knockout=False,
                        standings_processed=False
                    )
                    matches_to_create.append(match)
                
                # Rotate teams for the next round (keep the first team fixed)
                team_list.insert(1, team_list.pop())

        Match.objects.bulk_create(matches_to_create)
        
    return len(matches_to_create)
