"""
Stamina Engine — Virtual Master League
=======================================
"""

from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
import random

# CONSTANTS
BASE_FATIGUE_FULL_MATCH = Decimal('25.00')
MAX_STAMINA = Decimal('100.00')
MIN_STAMINA = Decimal('0.00')
FULL_MATCH_MINUTES = 90

POSITION_MULTIPLIER = {
    "GK": 0.5, "CB": 0.8, "FB": 1.1, "WB": 1.1,
    "DMF": 1.15, "CMF": 1.15, "AMF": 1.0,
    "LMF": 1.2, "RMF": 1.2, "LWF": 1.2, "RWF": 1.2,
    "SS": 1.05, "CF": 1.0,
}

def age_factor(age: int) -> float:
    if age <= 22: return 0.90
    if age <= 29: return 1.00
    if age <= 32: return 1.10
    return 1.25

def pes_stamina_factor(pes_stamina: int) -> float:
    raw = (100 - pes_stamina) / 10.0
    return max(0.5, min(raw, 2.0))

def gym_reduction(gym_level: int) -> float:
    from teams.models import ClubFacilities
    return 1.0 - ClubFacilities.scaled_effect(gym_level, 0.32)

def medical_multiplier(medical_level: int) -> float:
    from teams.models import ClubFacilities
    return 1.0 + ClubFacilities.scaled_effect(medical_level, 0.40)

def pool_multiplier(pool_level: int) -> float:
    from teams.models import ClubFacilities
    return 1.0 + ClubFacilities.scaled_effect(pool_level, 0.24)

def calculate_fatigue(player, club, minutes_played: int) -> Decimal:
    base_drain = (minutes_played / 90.0) * 25.0
    consecutive_penalty = min(player.consecutive_games * 1.5, 10.0)
    
    pos_mult = POSITION_MULTIPLIER.get(player.position_group, 1.0)
    gym_level = club.facilities.gym_level if hasattr(club, 'facilities') and club.facilities else 1

    drain = (
        base_drain
        * pos_mult
        * age_factor(player.age)
        * pes_stamina_factor(player.base_stamina)
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
    
    medical_level = club.facilities.medical_level if hasattr(club, 'facilities') and club.facilities else 1
    injury_reduction = ClubFacilities.scaled_effect(medical_level, 0.32)
    
    p_injury = 0.02 * risk_zone * (1.0 - injury_reduction)
    if random.random() < p_injury:
        duration = random.randint(3, 10) * (1.0 - injury_reduction)
        player.is_injured = True
        player.injury_return_date = timezone.now().date() + timedelta(days=round(duration))
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
    results = []
    
    if not match.home_team or not match.away_team:
        return results

    home_players = match.home_team.players.filter(is_starting=True)
    away_players = match.away_team.players.filter(is_starting=True)
    starting_players = list(home_players) + list(away_players)

    sub_in_events = MatchEvent.objects.filter(match=match, event_type='SUB_IN').select_related('player')
    sub_out_events = MatchEvent.objects.filter(match=match, event_type='SUB_OUT').select_related('player')

    sub_out_minutes = {e.player_id: e.minute for e in sub_out_events}
    sub_in_minutes = {e.player_id: e.minute for e in sub_in_events}

    for player in starting_players:
        if player.id in sub_out_minutes:
            minutes = sub_out_minutes[player.id]
        else:
            minutes = FULL_MATCH_MINUTES
        res = apply_fatigue(player, minutes)
        if res: results.append(res)

    for player_id, sub_minute in sub_in_minutes.items():
        from teams.models import Player
        try:
            player = Player.objects.get(id=player_id)
            minutes = FULL_MATCH_MINUTES - sub_minute
            res = apply_fatigue(player, minutes)
            if res: results.append(res)
        except Player.DoesNotExist:
            continue

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
