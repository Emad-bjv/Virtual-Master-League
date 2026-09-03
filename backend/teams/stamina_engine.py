"""
Stamina Engine — Virtual Master League
=======================================
Calibrated Fatigue & Recovery System:
- Baseline Fatigue: ~12% per 90-min match (Game 1 leaves player at ~85%-88%)
- Consecutive Penalty: +6.0% per consecutive match without rest
- Position Multiplier: 0.70 (GK) to 1.10 (Midfielders & Wingers)
- Age Factor: 0.95 (Youth) to 1.10 (Veteran >32)
- Gym Facility: Up to 20% fatigue reduction
- Automatic recovery (+15% to +20%) for resting & bench players post-match
"""

from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
import random

# CONSTANTS
BASE_FATIGUE_FULL_MATCH = Decimal('12.00')
MAX_STAMINA = Decimal('100.00')
MIN_STAMINA = Decimal('0.00')
FULL_MATCH_MINUTES = 90

POSITION_MULTIPLIER = {
    "GK": 0.70,
    "CB": 0.90,
    "FB": 1.05,
    "WB": 1.05,
    "DMF": 1.10,
    "CMF": 1.10,
    "AMF": 1.00,
    "LMF": 1.10,
    "RMF": 1.10,
    "LWF": 1.10,
    "RWF": 1.10,
    "SS": 1.00,
    "CF": 1.00,
}

def age_factor(age: int) -> float:
    if age <= 22: return 0.95
    if age <= 29: return 1.00
    if age <= 32: return 1.05
    return 1.10

def gym_reduction(gym_level: int) -> float:
    from teams.models import ClubFacilities
    return 1.0 - ClubFacilities.scaled_effect(gym_level, 0.25)

def gym_consecutive_multiplier(gym_level: int) -> float:
    from teams.models import ClubFacilities
    # Up to 60% reduction in consecutive match fatigue penalty
    return 1.0 - ClubFacilities.scaled_effect(gym_level, 0.60)

def medical_multiplier(medical_level: int) -> float:
    from teams.models import ClubFacilities
    return 1.0 + ClubFacilities.scaled_effect(medical_level, 0.50)

def pool_multiplier(pool_level: int) -> float:
    from teams.models import ClubFacilities
    # Up to +80% faster recovery to peak fitness
    return 1.0 + ClubFacilities.scaled_effect(pool_level, 0.80)

def calculate_fatigue(player, club, minutes_played: int) -> Decimal:
    """
    Fatigue calculation is disabled. Players never fatigue.
    """
    return Decimal('0.00')

def update_lock_status(player):
    """
    Stamina lock is disabled. Players are never locked due to stamina.
    """
    player.is_locked = False

def injury_check(player, club) -> bool:
    """
    Automatic in-match random injuries are disabled.
    Injuries and suspensions are registered exclusively by administrators.
    """
    return False

def apply_fatigue(player, minutes_played: int) -> dict:
    from django.utils import timezone
    club = player.team

    if not club:
        return {}

    player.virtual_stamina = Decimal('100.00')
    player.consecutive_games = 0
    player.last_match_date = timezone.now().date()
    player.is_locked = False
    
    update_fields = ['virtual_stamina', 'consecutive_games', 'last_match_date', 'is_locked']
    player.save(update_fields=update_fields)

    return {
        'player_id': player.id,
        'player_name': player.name,
        'minutes_played': minutes_played,
        'old_stamina': 100.0,
        'fatigue': 0.0,
        'new_stamina': 100.0,
        'consecutive_games': 0,
        'is_locked': False,
        'got_injured': False,
    }

def apply_recovery(player) -> dict:
    player.virtual_stamina = Decimal('100.00')
    player.consecutive_games = 0
    player.is_locked = False

    update_fields = ['virtual_stamina', 'consecutive_games', 'is_locked']
    if hasattr(player, 'injury_matches') and player.injury_matches <= 0 and player.is_injured:
        player.is_injured = False
        update_fields.append('is_injured')

    player.save(update_fields=update_fields)

    return {
        'player_id': player.id,
        'player_name': player.name,
        'old_stamina': 100.0,
        'recovery': 0.0,
        'new_stamina': 100.0,
        'is_locked': False,
    }

def apply_post_match_fatigue(match) -> list:
    from matches.models import MatchEvent
    from teams.models import Player
    results = []
    
    if not match.home_team or not match.away_team:
        return results

    home_players = match.home_team.players.filter(is_starting=True)
    away_players = match.away_team.players.filter(is_starting=True)
    starting_players = list(home_players) + list(away_players)

    sub_in_events = MatchEvent.objects.filter(match=match, event_type='SUB_IN', is_undone=False).select_related('player')
    sub_out_events = MatchEvent.objects.filter(match=match, event_type='SUB_OUT', is_undone=False).select_related('player')

    sub_out_minutes = {e.player_id: e.minute for e in sub_out_events}
    sub_in_minutes = {e.player_id: e.minute for e in sub_in_events}

    played_player_ids = set()

    for player in starting_players:
        played_player_ids.add(player.id)
        if player.id in sub_out_minutes:
            minutes = sub_out_minutes[player.id]
        else:
            minutes = FULL_MATCH_MINUTES
        res = apply_fatigue(player, minutes)
        if res: results.append(res)

    for player_id, sub_minute in sub_in_minutes.items():
        try:
            player = Player.objects.get(id=player_id)
            played_player_ids.add(player.id)
            minutes = FULL_MATCH_MINUTES - sub_minute
            res = apply_fatigue(player, minutes)
            if res: results.append(res)
        except Player.DoesNotExist:
            continue

    # Automatic recovery for resting/bench players of both teams who did NOT play
    all_home_players = match.home_team.players.all()
    all_away_players = match.away_team.players.all()
    all_squad_players = list(all_home_players) + list(all_away_players)

    for player in all_squad_players:
        if player.id not in played_player_ids:
            if player.virtual_stamina < MAX_STAMINA or player.is_injured or player.consecutive_games > 0:
                apply_recovery(player)

    return results

def apply_daily_recovery_all(match_date=None) -> list:
    from teams.models import Player
    if match_date is None:
        match_date = timezone.now().date()

    resting_players = Player.objects.exclude(last_match_date=match_date)
    results = []
    for player in resting_players:
        if player.virtual_stamina < MAX_STAMINA or player.is_injured:
            res = apply_recovery(player)
            results.append(res)
    return results

