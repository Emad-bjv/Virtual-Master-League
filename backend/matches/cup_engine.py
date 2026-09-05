"""
Cup Engine — Virtual Master League
===================================
Handles single-elimination tournament generation, bracket structure, and progression.
"""

import datetime
import math
import random
from django.db import transaction
from django.utils import timezone
from .models import Tournament, Match
from teams.models import Team

ROUND_NAMES_FA = {
    2: "فینال",
    4: "نیمه‌نهایی",
    8: "یک‌چهارم نهایی",
    16: "یک‌هشتم نهایی",
    32: "یک‌شانزدهم نهایی",
}


def get_round_name(num_teams: int) -> str:
    return ROUND_NAMES_FA.get(num_teams, f"مرحله {num_teams} تیم")


@transaction.atomic
def generate_cup_bracket(
    tournament: Tournament,
    teams: list[Team],
    start_date=None,
    time_slots=None,
    days_between_rounds=2,
    clear_existing=True,
    shuffle_draw=True
) -> dict:
    """
    Generates a single-elimination bracket for the given teams.
    Teams must be a power of 2 (e.g. 4, 8, 16, 32).
    """
    if len(teams) < 2 or not math.log2(len(teams)).is_integer():
        return {'success': False, 'error': 'تعداد تیم‌ها باید توانی از ۲ باشد (مثلاً ۴، ۸، ۱۶).'}

    if clear_existing:
        Match.objects.filter(tournament=tournament).delete()

    if start_date is None:
        start_date = datetime.date.today() + datetime.timedelta(days=1)
    elif isinstance(start_date, datetime.datetime):
        start_date = start_date.date()

    if not time_slots:
        time_slots = [(18, 0), (19, 0), (20, 0), (21, 0), (22, 0), (23, 0)]

    current_tz = timezone.get_current_timezone()

    # Shuffle teams for random draw if requested, otherwise maintain exact ordered manual pairings
    shuffled_teams = list(teams)
    if shuffle_draw:
        random.shuffle(shuffled_teams)

    # Dictionary to keep track of matches in each round
    # Key: round_size (e.g. 16, 8, 4, 2), Value: list of Matches
    rounds = {}
    current_size = len(teams)

    # Calculate dates for each round
    round_steps = []
    temp = current_size
    step_idx = 0
    round_dates = {}
    while temp >= 2:
        r_date = start_date + datetime.timedelta(days=step_idx * days_between_rounds)
        round_dates[temp] = r_date
        step_idx += 1
        temp //= 2

    # 1. Create empty placeholder matches for all rounds from Final down to first round
    temp_size = 2
    while temp_size <= current_size:
        round_matches = []
        num_matches = temp_size // 2
        r_date = round_dates[temp_size]

        for match_idx in range(num_matches):
            slot_h, slot_m = time_slots[match_idx % len(time_slots)]
            naive_dt = datetime.datetime.combine(r_date, datetime.time(slot_h, slot_m))
            slot_dt = timezone.make_aware(naive_dt, current_tz) if timezone.is_naive(naive_dt) else naive_dt

            m = Match.objects.create(
                tournament=tournament,
                round_name=get_round_name(temp_size),
                is_knockout=True,
                status='SCHEDULED',
                half_status='NOT_STARTED',
                date=slot_dt,
            )
            round_matches.append(m)
        rounds[temp_size] = round_matches
        temp_size *= 2

    # 2. Link matches using next_match
    temp_size = 4
    while temp_size <= current_size:
        prev_round = rounds[temp_size // 2]  # the next round after this one
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
        'tournament_id': tournament.id,
        'tournament_name': tournament.name,
        'matches_created': sum(len(m_list) for m_list in rounds.values()),
        'first_round_matches': len(first_round),
        'rounds_count': len(rounds),
    }


def advance_winner(match: Match) -> dict:
    """
    Determines the winner of a knockout match and advances them to the next match.
    """
    if not match.is_knockout:
        return {'success': False, 'error': 'این مسابقه حذفی نیست.'}

    if match.status != 'FINISHED':
        return {'success': False, 'error': 'مسابقه هنوز پایان نیافته است.'}

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

    if not match.next_match:
        return {
            'success': True,
            'is_champion': True,
            'winner': winner.name,
            'message': f'مسابقه فینال بود! قهرمان: {winner.name}'
        }

    # Advance winner to next match
    next_match = match.next_match

    with transaction.atomic():
        # Find which slot (home or away) this match feeds into
        # If previous_matches has 2 matches, match with lower ID or first in order feeds home
        sibling_matches = list(Match.objects.filter(next_match=next_match).order_by('id'))
        is_first_feeder = (len(sibling_matches) > 0 and sibling_matches[0].id == match.id)

        if is_first_feeder:
            next_match.home_team = winner
            next_match.save(update_fields=['home_team'])
        else:
            next_match.away_team = winner
            next_match.save(update_fields=['away_team'])

    return {
        'success': True,
        'winner': winner.name,
        'next_match_id': next_match.id,
        'advanced_to': str(next_match)
    }


def serialize_cup_bracket(tournament: Tournament) -> dict:
    """
    Serializes full cup tournament bracket data grouped into sequential round tiers
    ready for visual bracket component in React.
    """
    matches = (
        Match.objects.filter(tournament=tournament, is_knockout=True)
        .select_related('home_team', 'away_team', 'next_match')
        .order_by('id')
    )

    if not matches.exists():
        return {'tournament': {'id': tournament.id, 'name': tournament.name}, 'rounds': []}

    # Group matches by round_name
    rounds_map = {}
    for m in matches:
        r_name = m.round_name or 'حذفی'
        if r_name not in rounds_map:
            rounds_map[r_name] = []
        rounds_map[r_name].append({
            'id': m.id,
            'round_name': m.round_name,
            'home_team_id': m.home_team_id,
            'home_team_name': m.home_team.name if m.home_team else 'مشخص نشده',
            'home_team_logo': m.home_team.logo if m.home_team else '',
            'away_team_id': m.away_team_id,
            'away_team_name': m.away_team.name if m.away_team else 'مشخص نشده',
            'away_team_logo': m.away_team.logo if m.away_team else '',
            'home_score': m.home_score,
            'away_score': m.away_score,
            'home_penalties': m.home_penalties,
            'away_penalties': m.away_penalties,
            'status': m.status,
            'half_status': m.half_status,
            'date': m.date.isoformat() if m.date else None,
            'next_match_id': m.next_match_id,
        })

    # Order rounds from first round down to Final
    round_order_keys = ["یک‌شانزدهم نهایی", "یک‌هشتم نهایی", "یک‌چهارم نهایی", "نیمه‌نهایی", "فینال"]
    sorted_rounds = []
    
    # Add known rounds in order
    for rk in round_order_keys:
        if rk in rounds_map:
            sorted_rounds.append({'name': rk, 'matches': rounds_map.pop(rk)})

    # Append any remaining rounds
    for rk, m_list in rounds_map.items():
        sorted_rounds.append({'name': rk, 'matches': m_list})

    return {
        'tournament': {
            'id': tournament.id,
            'name': tournament.name,
            'is_active': tournament.is_active,
            'created_at': tournament.created_at.isoformat(),
        },
        'rounds': sorted_rounds
    }
