"""
Cup Engine — Virtual Master League
===================================
Handles single-elimination tournament generation and progression.
"""

import math
import random
from django.db import transaction
from .models import Tournament, Match
from teams.models import Team


def get_round_name(num_teams: int) -> str:
    if num_teams == 2:
        return "Final"
    elif num_teams == 4:
        return "Semi-Finals"
    elif num_teams == 8:
        return "Quarter-Finals"
    elif num_teams == 16:
        return "Round of 16"
    else:
        return f"Round of {num_teams}"


@transaction.atomic
def generate_cup_bracket(tournament: Tournament, teams: list[Team]) -> dict:
    """
    Generates a single-elimination bracket for the given teams.
    Teams must be a power of 2 (e.g. 4, 8, 16, 32).
    """
    if len(teams) < 2 or not math.log2(len(teams)).is_integer():
        return {'success': False, 'error': 'تعداد تیم‌ها باید توانی از ۲ باشد (مثلاً ۴، ۸، ۱۶).'}

    # Shuffle teams for random draw
    shuffled_teams = list(teams)
    random.shuffle(shuffled_teams)

    # Dictionary to keep track of matches in each round
    # Key: round_size (e.g. 16, 8, 4, 2), Value: list of Matches
    rounds = {}
    current_size = len(teams)

    # 1. Create empty placeholder matches for all rounds from Final up to first round
    # Work backwards: Final (2 teams) -> Semi (4 teams) -> ...
    temp_size = 2
    while temp_size <= current_size:
        round_matches = []
        num_matches = temp_size // 2
        for _ in range(num_matches):
            m = Match.objects.create(
                tournament=tournament,
                round_name=get_round_name(temp_size),
                is_knockout=True,
                status='SCHEDULED'
            )
            round_matches.append(m)
        rounds[temp_size] = round_matches
        temp_size *= 2

    # 2. Link matches using next_match
    temp_size = 4
    while temp_size <= current_size:
        prev_round = rounds[temp_size // 2] # the round after this one
        curr_round = rounds[temp_size]

        # Each match in prev_round gets 2 matches from curr_round feeding into it
        for i, prev_match in enumerate(prev_round):
            curr_match_1 = curr_round[2 * i]
            curr_match_2 = curr_round[2 * i + 1]
            
            curr_match_1.next_match = prev_match
            curr_match_1.save(update_fields=['next_match'])
            
            curr_match_2.next_match = prev_match
            curr_match_2.save(update_fields=['next_match'])
            
        temp_size *= 2

    # 3. Populate first round with teams
    first_round = rounds[current_size]
    for i, match in enumerate(first_round):
        match.home_team = shuffled_teams[2 * i]
        match.away_team = shuffled_teams[2 * i + 1]
        match.save(update_fields=['home_team', 'away_team'])

    return {
        'success': True,
        'matches_created': sum(len(m_list) for m_list in rounds.values()),
        'first_round_matches': len(first_round)
    }


def advance_winner(match: Match) -> dict:
    """
    Determines the winner of a knockout match and advances them to the next match.
    """
    if not match.is_knockout:
        return {'success': False, 'error': 'این مسابقه حذفی نیست.'}
        
    if match.status != 'FINISHED':
        return {'success': False, 'error': 'مسابقه هنوز پایان نیافته است.'}
        
    if not match.next_match:
        return {'success': True, 'message': 'این مسابقه فینال بود.'}

    # Determine winner
    winner = None
    if match.home_score > match.away_score:
        winner = match.home_team
    elif match.away_score > match.home_score:
        winner = match.away_team
    else:
        # Tie, check penalties
        if match.home_penalties is not None and match.away_penalties is not None:
            if match.home_penalties > match.away_penalties:
                winner = match.home_team
            elif match.away_penalties > match.home_penalties:
                winner = match.away_team
            else:
                return {'success': False, 'error': 'ضربات پنالتی نمی‌تواند مساوی باشد.'}
        else:
            return {'success': False, 'error': 'بازی مساوی شده اما ضربات پنالتی ثبت نشده است.'}

    if not winner:
         return {'success': False, 'error': 'برنده مشخص نشد.'}

    # Advance winner to next match
    next_match = match.next_match
    
    with transaction.atomic():
        if not next_match.home_team:
            next_match.home_team = winner
            next_match.save(update_fields=['home_team'])
        elif not next_match.away_team:
            if next_match.home_team == winner:
                return {'success': False, 'error': 'تیم قبلاً به بازی بعدی اضافه شده است.'}
            next_match.away_team = winner
            next_match.save(update_fields=['away_team'])
        else:
            return {'success': False, 'error': 'بازی بعدی قبلاً پر شده است (هر دو تیم مشخص هستند).'}

    return {
        'success': True, 
        'winner': winner.name, 
        'advanced_to': str(next_match)
    }
