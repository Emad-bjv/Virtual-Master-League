from django.db import transaction
from decimal import Decimal
from .models import Player, PlayerLevelConfig, PlayerLevelUpLog, ClubFacilities
from notifications.models import Notification

# The same abilities map used by growth_engine
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

# =========================================================================
# Tiered Escalating Gem Upgrade Costs (پلکانی سناریو ۱: مجموع ~۵,۰۰۰ الماس)
# =========================================================================
GEM_BOOST_TIER_COSTS = {
    1: 10,     # Level 1 -> 2
    2: 15,     # Level 2 -> 3
    3: 20,     # Level 3 -> 4
    4: 25,     # Level 4 -> 5
    5: 35,     # Level 5 -> 6 (پایان مرحله پایه)
    6: 50,     # Level 6 -> 7
    7: 70,     # Level 7 -> 8
    8: 95,     # Level 8 -> 9
    9: 125,    # Level 9 -> 10
    10: 160,   # Level 10 -> 11 (پایان مرحله پیشرفته)
    11: 200,   # Level 11 -> 12
    12: 250,   # Level 12 -> 13
    13: 310,   # Level 13 -> 14
    14: 380,   # Level 14 -> 15
    15: 460,   # Level 15 -> 16 (شکستن سقف پتانسیل)
    16: 550,   # Level 16 -> 17
    17: 650,   # Level 17 -> 18
    18: 760,   # Level 18 -> 19
    19: 880,   # Level 19 -> 20 (رسیدن به حداکثر اورال ۹۹ در PES)
}


def get_gem_boost_cost(current_level: int) -> int:
    """
    Returns escalating tiered gem cost to upgrade from current_level to next level.
    """
    return GEM_BOOST_TIER_COSTS.get(current_level, 880)


def calculate_gem_boost_ovr(base_ovr: int, target_level: int) -> int:
    """
    Calculates target OVR when upgraded via gems.
    At level 1 -> base_ovr
    At level 20 -> 99 (Maximum PES overall)
    """
    if target_level <= 1:
        return base_ovr
    if target_level >= 20:
        return 99
    growth_fraction = (target_level - 1) / 19.0
    scaled_ovr = base_ovr + round((99 - base_ovr) * growth_fraction)
    return min(99, max(base_ovr, int(scaled_ovr)))


def get_xp_required(level: int) -> int:
    """Returns XP required to reach the NEXT level (e.g. level 1 -> 2)."""
    if level >= 20:
        return 0
    config = PlayerLevelConfig.objects.filter(level=level).first()
    return config.xp_required if config else 999999


def grant_match_xp(player, match, rating: float, events: list, won: bool, was_starter: bool):
    """
    Grants XP automatically based on match performance.
    """
    if player.level >= 20:
        return

    xp = 0
    if rating >= 7.0:
        xp = int((rating - 5.0) * 12)
    elif rating >= 5.0:
        xp = int((rating - 5.0) * 6)
    
    if xp == 0:
        return

    if won:
        xp += 15
    if was_starter:
        xp += 5

    pos = player.position_group
    goals = sum(1 for e in events if e.event_type == 'GOAL')
    if pos in ['CF', 'SS', 'WING', 'AMF', 'CMF']:
        xp += goals * 8
    
    # Apply training camp multiplier
    camp_mult = 1.0
    if player.team and hasattr(player.team, 'facilities') and player.team.facilities:
        camp_mult = 1.0 + (player.team.facilities.training_camp_level * 0.03)
    
    # Apply Youth Academy multiplier for young players (age <= 23: +2.5% per level)
    academy_mult = 1.0
    if player.age <= 23 and player.team and hasattr(player.team, 'facilities') and player.team.facilities:
        academy_mult = 1.0 + (player.team.facilities.academy_level * 0.025)

    final_xp = int(xp * camp_mult * academy_mult)

    add_xp_and_check_level_up(player, final_xp, 'MATCH', f"عملکرد بازی ({rating})")


def grant_facility_xp(team, facility_name: str, new_level: int):
    """
    Grants XP to all players in the team when a facility is upgraded.
    """
    xp_to_add = new_level * 3
    
    players = Player.objects.filter(team=team, level__lt=20)
    for player in players:
        add_xp_and_check_level_up(player, xp_to_add, 'FACILITY', f"ارتقای تسهیلات ({facility_name} به لول {new_level})")


def grant_gem_boost(player, team):
    """
    Directly levels up the player using gems.
    Bypasses potential_ovr ceiling and scales steadily up to 99 OVR at Level 20.
    """
    if player.level >= 20:
        return False, "بازیکن در حال حاضر به حداکثر سطح ممکن (لول ۲۰ - OVR ۹۹) رسیده است."

    gem_cost = get_gem_boost_cost(player.level)
    
    from economy.services import process_atomic_wallet_update
    wallet_res = process_atomic_wallet_update(
        team_id=team.id,
        amount=-gem_cost,
        currency='GEMS',
        transaction_type='GEM_BOOST',
        description=f"ارتقای ویژه الماس بازیکن {player.name} (سطح {player.level} به {player.level + 1})"
    )

    if not wallet_res.get('success'):
        return False, f"الماس (جم) کافی نیست. هزینه ارتقا به سطح {player.level + 1}: {gem_cost} 💎 (موجودی شما: {team.gems} 💎)"

    old_level = player.level
    old_ovr = player.overall
    player.level += 1
    player.xp = 0  # Reset XP for the new level
    
    # Ensure base_overall is preserved
    if not player.base_overall:
        player.base_overall = old_ovr

    # Calculate new OVR with target scaling to 99 at level 20
    target_ovr = calculate_gem_boost_ovr(player.base_overall, player.level)
    player.overall = min(99, max(old_ovr + 1, target_ovr))
    if player.level >= 20:
        player.overall = 99
        
    player.save(update_fields=['level', 'xp', 'base_overall', 'overall'])
    
    if player.team:
        try:
            player.team.update_star_rating(save=True)
        except Exception:
            pass
    
    PlayerLevelUpLog.objects.create(
        player=player,
        old_level=old_level,
        new_level=player.level,
        xp_source='GEM_BOOST',
        xp_amount=0,
        details=f"ارتقای لول با {gem_cost} الماس به OVR {player.overall}"
    )
    
    Notification.objects.create(
        team=player.team,
        category='TRANSFER',
        title=f"💎 ارتقای الماس: {player.name}",
        message=f"بازیکن {player.name} با مصرف {gem_cost} الماس به لول {player.level} و قدرت {player.overall} ارتقا یافت! (حداکثر در لول ۲۰ = ۹۹)"
    )
    
    return True, f"بازیکن «{player.name}» با موفقیت به سطح {player.level} و اورال {player.overall} ارتقا یافت! ✨"


def add_xp_and_check_level_up(player, xp_amount: int, source: str, details: str):
    """
    Core function to add XP and trigger level up if threshold is met.
    Free XP track strictly respects potential_ovr ceiling.
    """
    if player.level >= 20 or xp_amount <= 0:
        return

    player.xp += xp_amount
    player.total_xp += xp_amount
    
    leveled_up = False
    old_level = player.level

    while player.level < 20:
        needed = get_xp_required(player.level)
        if player.xp >= needed:
            player.xp -= needed
            player.level += 1
            leveled_up = True
            apply_level_bonus(player, player.level)
        else:
            break

    if player.level >= 20:
        player.xp = 0

    player.save(update_fields=['xp', 'total_xp', 'level'])

    if leveled_up:
        PlayerLevelUpLog.objects.create(
            player=player,
            old_level=old_level,
            new_level=player.level,
            xp_source=source,
            xp_amount=xp_amount,
            details=details
        )
        
        Notification.objects.create(
            team=player.team,
            category='TRANSFER',
            title=f"ارتقای لول: {player.name}",
            message=f"بازیکن {player.name} از طریق {details} به لول {player.level} ارتقا یافت! (سقف رشد رایگان: OVR {player.potential_ovr})"
        )


def apply_level_bonus(player, new_level: int):
    """
    Applies ability bonus via growth_buffer based on potential_ovr gap.
    Free XP track NEVER exceeds player.potential_ovr.
    """
    if player.overall >= player.potential_ovr:
        # Reached potential ceiling for free growth
        return

    from teams.growth_engine import _accumulate
    
    potential_gap = max(1, player.potential_ovr - player.overall)
    potential_factor = max(0.3, min(1.5, potential_gap / 15.0))
    
    pos = player.position_group
    abilities = POSITION_ABILITIES.get(pos, POSITION_ABILITIES["CMF"])
    
    primary_bonus = 0.5 * potential_factor
    secondary_bonus = 0.25 * potential_factor
    
    for _ in abilities["primary"]:
        _accumulate(player, primary_bonus)
        
    for _ in abilities["secondary"]:
        _accumulate(player, secondary_bonus)
