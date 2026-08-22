"""
Player Growth & Decline Engine — Virtual Master League
======================================================
Growth is computed directly on the Player model (overall / potential_ovr).

The PlayerAbilities model has been removed, so all ability-level growth now
maps onto the player's overall rating via a persistent fractional
`growth_buffer` field on Player. Deltas from every position ability (primary
and secondary) accumulate into that buffer, and each full point flips over
into a +1/-1 change on `player.overall` — capped at `potential_ovr` and
floored at MIN_OVR. No PlayerAbilities lookup is performed anywhere.
"""

from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Avg
from .models import Player, PlayerGrowthLog
from matches.models import PlayerMatchStat, MatchEvent

MIN_GAMES_REQUIRED = 3
MIN_OVR = 50
MAX_OVR = 99

def performance_index(avg_rating: float) -> float:
    return max(0.0, min(100.0, 50.0 + (avg_rating - 6.0) * 25.0))

GROWTH_BANDS = [
    (85, 100, 0.30, 0.15),
    (70, 84,  0.20, 0.10),
    (55, 69,  0.10, 0.05),
    (40, 54,  0.00, 0.00),
    (25, 39, -0.10, -0.05),
    (0,  24, -0.20, -0.10),
]

# Kept for position-group weighting: every group contributes the same
# number of abilities (2 primary + 2 secondary), but the bonus/rust-decay
# logic branches on the specific role (GK vs attacker vs playmaker).
POSITION_ABILITIES = {
    "GK":  {"primary": ["gk_reflexes", "gk_catching"], "secondary": ["gk_reach", "gk_awareness"]},
    "CB":  {"primary": ["defensive_awareness", "ball_winning"], "secondary": ["aggression", "heading"]},
    "FB":  {"primary": ["defensive_awareness", "speed"], "secondary": ["stamina", "dribbling"]},
    "DMF": {"primary": ["ball_winning", "defensive_awareness"], "secondary": ["low_pass", "ball_control"]},
    "CMF": {"primary": ["low_pass", "ball_control"], "secondary": ["lofted_pass", "dribbling"]},
    "AMF": {"primary": ["offensive_awareness", "dribbling"], "secondary": ["low_pass", "finishing"]},
    "WING": {"primary": ["speed", "dribbling"], "secondary": ["offensive_awareness", "curl"]},
    "SS":  {"primary": ["offensive_awareness", "finishing"], "secondary": ["dribbling", "ball_control"]},
    "CF":  {"primary": ["finishing", "offensive_awareness"], "secondary": ["heading", "kicking_power"]},
}

def age_growth_multiplier(age: int) -> float:
    if age <= 21: return 1.5
    if age <= 25: return 1.2
    if age <= 29: return 1.0
    if age <= 32: return 0.6
    return 0.3

def age_decline_multiplier(age: int) -> float:
    if age <= 25: return 0.8
    if age <= 29: return 1.0
    if age <= 32: return 1.3
    return 1.6

def _accumulate(player, delta: float):
    """
    Accumulates a fractional growth/decline delta directly on the Player.

    The fractional remainder persists in `player.growth_buffer` between
    evaluation cycles; every full accumulated point moves `overall` by +1
    (capped at potential_ovr) or -1 (floored at MIN_OVR).
    """
    buffer = float(player.growth_buffer) + float(delta)

    while buffer >= 1.0:
        if player.overall < player.potential_ovr:
            player.overall = min(player.overall + 1, player.potential_ovr)
        buffer -= 1.0

    while buffer <= -1.0:
        player.overall = max(player.overall - 1, MIN_OVR)
        buffer += 1.0

    player.growth_buffer = Decimal(str(round(buffer, 4)))
    player.save(update_fields=['overall', 'growth_buffer'])

def check_extra_stat_bonus(player, match_ids) -> bool:
    pos = player.position_group
    if pos in ['CF', 'SS', 'WING']:
        goals = MatchEvent.objects.filter(match_id__in=match_ids, player=player, event_type='GOAL').count()
        return goals >= 4
    elif pos in ['AMF', 'CMF', 'DMF']:
        assists = MatchEvent.objects.filter(match_id__in=match_ids, player=player, event_type='ASSIST').count()
        return assists >= 6
    elif pos in ['CB', 'FB', 'GK']:
        stats = PlayerMatchStat.objects.filter(player=player, match_id__in=match_ids)
        avg = stats.aggregate(avg=Avg('rating'))['avg']
        if avg:
            return float(avg) >= 7.0
        return False
    return False

def apply_growth(player, club, avg_rating: float, extra_stat_bonus_hit: bool, neutral_band_bonus: int = 0):
    pi = performance_index(avg_rating)
    if (40 - neutral_band_bonus) <= pi <= (54 + neutral_band_bonus):
        primary_delta, secondary_delta = 0.00, 0.00
    else:
        band = next((b for b in GROWTH_BANDS if b[0] <= pi <= b[1]), GROWTH_BANDS[-1])
        _, _, primary_delta, secondary_delta = band

    abilities = POSITION_ABILITIES.get(player.position_group, POSITION_ABILITIES["CMF"])

    from teams.models import ClubFacilities
    camp_mult = 1.0
    if club is not None and hasattr(club, 'facilities') and club.facilities:
        camp_mult = 1.0 + ClubFacilities.scaled_effect(club.facilities.training_camp_level, 0.60)

    for ability_name in abilities["primary"]:
        delta = primary_delta
        if delta > 0:
            delta *= age_growth_multiplier(player.age) * camp_mult
        else:
            delta *= age_decline_multiplier(player.age)
        _accumulate(player, delta)

    for ability_name in abilities["secondary"]:
        delta = secondary_delta
        if delta > 0:
            delta *= age_growth_multiplier(player.age) * camp_mult
        else:
            delta *= age_decline_multiplier(player.age)
        _accumulate(player, delta)

    if extra_stat_bonus_hit:
        _accumulate(player, 1.0 * age_growth_multiplier(player.age))

def apply_rust_decay(player):
    if player.matches_benched_streak >= 5:
        abilities = POSITION_ABILITIES.get(player.position_group, POSITION_ABILITIES["CMF"])
        for ability_name in abilities["primary"]:
            _accumulate(player, -0.03)

def evaluate_player(player: Player, match_ids: list, period_name: str) -> dict:
    stats = PlayerMatchStat.objects.filter(
        player=player,
        match_id__in=match_ids,
        rating__isnull=False
    )

    games_played = stats.count()

    if games_played == 0:
        player.matches_benched_streak += 1
        player.save(update_fields=['matches_benched_streak'])
        apply_rust_decay(player)
        return {
            'player_id': player.id,
            'player_name': player.name,
            'status': 'SKIPPED',
            'reason': 'عدم بازی (افزایش زنگ‌زدگی)'
        }
    else:
        player.matches_benched_streak = 0
        player.save(update_fields=['matches_benched_streak'])

    if games_played < MIN_GAMES_REQUIRED:
        return {
            'player_id': player.id,
            'player_name': player.name,
            'status': 'SKIPPED',
            'reason': f'بازی‌های انجام‌شده ({games_played}) کمتر از حد نصاب ({MIN_GAMES_REQUIRED}) است.'
        }

    avg_rating_val = stats.aggregate(avg=Avg('rating'))['avg']

    avg_rating = float(avg_rating_val) if avg_rating_val else 0.0

    goals_scored = MatchEvent.objects.filter(
        match_id__in=match_ids,
        player=player,
        event_type='GOAL'
    ).count()

    bonus_hit = check_extra_stat_bonus(player, match_ids)

    # The neutral (no-change) PI band widens as the club's medical center improves
    neutral_band_bonus = 0
    if player.team is not None and hasattr(player.team, 'facilities') and player.team.facilities:
        from teams.models import ClubFacilities
        neutral_band_bonus = int(round(ClubFacilities.scaled_effect(player.team.facilities.medical_level, 4.0)))

    old_ovr = player.overall

    with transaction.atomic():
        apply_growth(player, player.team, avg_rating, bonus_hit, neutral_band_bonus)

        new_ovr = player.overall
        actual_change = new_ovr - old_ovr

        change_type = 'UPGRADE' if actual_change > 0 else ('DOWNGRADE' if actual_change < 0 else 'NO_CHANGE')

        log_entry = PlayerGrowthLog.objects.create(
            player=player,
            period_name=period_name,
            old_overall=old_ovr,
            new_overall=new_ovr,
            change_amount=actual_change,
            change_type=change_type,
            avg_rating=Decimal(str(avg_rating)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            games_played=games_played,
            goals_scored=goals_scored,
            notes=f"PI: {performance_index(avg_rating):.1f} | Bonus: {bonus_hit}"
        )

    return {
        'player_id': player.id,
        'player_name': player.name,
        'status': 'PROCESSED',
        'old_overall': old_ovr,
        'new_overall': new_ovr,
        'change_amount': actual_change,
        'change_type': change_type,
        'avg_rating': avg_rating,
        'games_played': games_played,
        'goals_scored': goals_scored,
        'notes': log_entry.notes
    }

def run_evaluation_cycle(match_ids: list, period_name: str) -> dict:
    all_players = Player.objects.all()

    processed_count = 0
    upgrades_count = 0
    downgrades_count = 0
    skipped_count = 0

    results = []

    for player in all_players:
        res = evaluate_player(player, match_ids, period_name)
        results.append(res)

        if res['status'] == 'PROCESSED':
            processed_count += 1
            if res['change_type'] == 'UPGRADE':
                upgrades_count += 1
            elif res['change_type'] == 'DOWNGRADE':
                downgrades_count += 1
        else:
            skipped_count += 1

    return {
        'period_name': period_name,
        'matches_evaluated_count': len(match_ids),
        'total_players_checked': len(all_players),
        'processed_count': processed_count,
        'upgrades_count': upgrades_count,
        'downgrades_count': downgrades_count,
        'skipped_count': skipped_count,
        'results': results
    }

def generate_academy_prospect(club) -> int:
    from teams.models import ClubFacilities
    level = club.facilities.academy_level if hasattr(club, 'facilities') and club.facilities else 1
    youth_potential = 65.0 + ClubFacilities.scaled_effect(level, 20.0)
    return round(youth_potential)

def graduates_count(club) -> int:
    level = club.facilities.academy_level if hasattr(club, 'facilities') and club.facilities else 1
    if level >= 20: return 4
    if level >= 14: return 3
    if level >= 5:  return 2
    return 1

def sync_youth_academy_potentials(team, level: int = None) -> list:
    """
    Step-by-step increases the potential OVR cap for all players under 25 years old
    based on the Youth Academy level, up to a maximum cap of 90 OVR.
    """
    from teams.models import ClubFacilities, Player
    if level is None:
        level = team.facilities.academy_level if hasattr(team, 'facilities') and team.facilities else 0
    
    potential_boost = round(ClubFacilities.scaled_effect(level, 15.0))
    young_players = Player.objects.filter(team=team, age__lt=25)
    
    updated_players = []
    for yp in young_players:
        base_pot = yp.base_overall or yp.overall
        target_potential = min(90, max(yp.overall + 2, base_pot + 2 + int(potential_boost)))
        if target_potential > yp.potential_ovr or yp.potential_ovr < target_potential:
            yp.potential_ovr = target_potential
            yp.save(update_fields=['potential_ovr'])
            updated_players.append(yp)
            
    return updated_players
