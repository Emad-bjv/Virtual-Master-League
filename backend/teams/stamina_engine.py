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
    base_drain = (minutes_played / 90.0) * float(BASE_FATIGUE_FULL_MATCH)
    gym_level = club.facilities.gym_level if club and hasattr(club, 'facilities') and club.facilities else 1
    
    # Gym level allows players to sustain more consecutive matches:
    # 1. Level >= 10 provides 1 free consecutive match buffer
    # 2. Gym reduces consecutive penalty slope by up to 60%
    free_buffer = 1 if gym_level >= 10 else 0
    effective_consecutive = max(0, player.consecutive_games - free_buffer)
    consecutive_penalty = float(effective_consecutive) * 6.0 * gym_consecutive_multiplier(gym_level)
    
    pos_mult = POSITION_MULTIPLIER.get(player.position_group, 1.0)

    drain = (
        base_drain
        * pos_mult
        * age_factor(player.age)
        * gym_reduction(gym_level)
    ) + consecutive_penalty
    
    return Decimal(str(drain)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def update_lock_status(player):
    current_stamina = float(player.virtual_stamina)
    if current_stamina < 30:
        player.is_locked = True
    elif current_stamina >= 40:
        player.is_locked = False

def injury_check(player, club) -> bool:
    from datetime import timedelta
    from teams.models import ClubFacilities
    current_stamina = float(player.virtual_stamina)
    risk_zone = 1.5 if 30 <= current_stamina <= 50 else 1.0
    
    medical_level = club.facilities.medical_level if club and hasattr(club, 'facilities') and club.facilities else 1
    injury_reduction = ClubFacilities.scaled_effect(medical_level, 0.45)
    
    p_injury = 0.02 * risk_zone * (1.0 - injury_reduction)
    if random.random() < p_injury:
        duration = random.randint(3, 10) * (1.0 - injury_reduction)
        player.is_injured = True
        player.injury_return_date = timezone.now().date() + timedelta(days=max(1, round(duration)))
        return True
    return False

def apply_fatigue(player, minutes_played: int) -> dict:
    from django.utils import timezone
    old_stamina = Decimal(str(player.virtual_stamina))
    club = player.team

    if not club:
        return {}

    fatigue = calculate_fatigue(player, club, minutes_played)
    new_stamina = max(MIN_STAMINA, old_stamina - fatigue)

    player.virtual_stamina = new_stamina
    player.consecutive_games += 1
    player.last_match_date = timezone.now().date()
    
    update_lock_status(player)
    got_injured = injury_check(player, club)
    
    update_fields = ['virtual_stamina', 'consecutive_games', 'last_match_date', 'is_locked']
    if got_injured:
        update_fields.extend(['is_injured', 'injury_return_date'])
        
    player.save(update_fields=update_fields)

    return {
        'player_id': player.id,
        'player_name': player.name,
        'minutes_played': minutes_played,
        'old_stamina': float(old_stamina),
        'fatigue': float(fatigue),
        'new_stamina': float(new_stamina),
        'consecutive_games': player.consecutive_games,
        'is_locked': player.is_locked,
        'got_injured': got_injured,
    }

def apply_recovery(player) -> dict:
    old_stamina = Decimal(str(player.virtual_stamina))
    club = player.team
    medical_level = club.facilities.medical_level if club and hasattr(club, 'facilities') and club.facilities else 1
    pool_level = club.facilities.pool_level if club and hasattr(club, 'facilities') and club.facilities else 1
    
    base_rec = 5.0 if player.is_injured else 15.0
    recovery = base_rec * medical_multiplier(medical_level) * pool_multiplier(pool_level)
    recovery_dec = Decimal(str(recovery)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    new_stamina = min(MAX_STAMINA, old_stamina + recovery_dec)

    player.virtual_stamina = new_stamina
    player.consecutive_games = 0
    
    if player.is_injured and player.injury_return_date:
        if timezone.now().date() >= player.injury_return_date:
            player.is_injured = False
            player.injury_return_date = None

    update_lock_status(player)
    
    player.save(update_fields=['virtual_stamina', 'consecutive_games', 'is_locked', 'is_injured', 'injury_return_date'])

    return {
        'player_id': player.id,
        'player_name': player.name,
        'old_stamina': float(old_stamina),
        'recovery': float(recovery_dec),
        'new_stamina': float(new_stamina),
        'is_locked': player.is_locked,
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

