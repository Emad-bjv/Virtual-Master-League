from django.db import transaction
from django.utils import timezone
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


# =========================================================================
# PES Position-Specific Skill Upgrades System (20 Levels, +1 PES per 2 Lvls)
# =========================================================================

def get_pes_skill_upgrade_cost(current_level: int) -> int:
    """
    Tiered gem costs for 20 skill levels with gentle slope starting from 5 gems:
    - Levels 1 to 5 (from lvl 0 to 4): 5 Gems
    - Levels 6 to 10 (from lvl 5 to 9): 8 Gems
    - Levels 11 to 15 (from lvl 10 to 14): 12 Gems
    - Levels 16 to 20 (from lvl 15 to 19): 16 Gems
    - Level 20: 0 (Maxed out)
    """
    if current_level < 5:
        return 5
    elif current_level < 10:
        return 8
    elif current_level < 15:
        return 12
    elif current_level < 20:
        return 16
    return 0


def upgrade_player_pes_skill(player, skill_key: str, role: str = None) -> tuple:
    """
    Upgrades a specific skill for a player:
    - Validates skill existence in player's position spec
    - Checks level cap (20)
    - Deducts gems atomically from team's wallet
    - Increments skill level, calculates new PES attribute (+1 PES every 2 levels)
    - Sets pes_applied = False so admin sees change pending in PES
    - Sends manager notification
    """
    team = player.team
    if not team:
        return False, "بازیکن در تیمی عضو نیست.", {}

    spec = player.get_pes_skill_spec(role=role)
    matched_spec = next((s for s in spec if s['key'] == skill_key), None)
    if not matched_spec:
        return False, f"مهارت «{skill_key}» با پست این بازیکن سازگار نیست.", {}

    skills_data = dict(player.skills_data or {})
    skill_info = dict(skills_data.get(skill_key, {}))
    current_lvl = skill_info.get('level', 0)

    if current_lvl >= 20:
        return False, f"مهارت «{matched_spec['name']}» در حال حاضر به حداکثر سطح (لول ۲۰) رسیده است.", {}

    cost = get_pes_skill_upgrade_cost(current_lvl)

    from economy.services import process_atomic_wallet_update
    wallet_res = process_atomic_wallet_update(
        team_id=team.id,
        amount=-cost,
        currency='GEMS',
        transaction_type='PLAYER_LEVEL_UP',
        description=f"ارتقای مهارت {matched_spec['name']} بازیکن {player.name} به سطح {current_lvl + 1}"
    )

    if not wallet_res.get('success'):
        return False, f"الماس کافی نیست. هزینه ارتقا: {cost} 💎 (موجودی: {team.gems} 💎)", {}

    new_lvl = current_lvl + 1
    base_ovr = player.base_overall or player.overall or 75
    default_base = max(50, min(95, base_ovr - 2))
    base_pes = skill_info.get('base_pes', default_base)
    pes_bonus = new_lvl // 2
    current_pes = min(99, base_pes + pes_bonus)

    skill_info.update({
        'name': matched_spec['name'],
        'level': new_lvl,
        'base_pes': base_pes,
        'current_pes': current_pes,
        'pes_bonus': pes_bonus,
        'pes_applied': False,  # Pending PES admin update
        'updated_at': timezone.now().isoformat()
    })
    skills_data[skill_key] = skill_info
    player.skills_data = skills_data
    player.save(update_fields=['skills_data'])

    team.refresh_from_db(fields=['gems'])

    Notification.objects.create(
        team=team,
        category='TRANSFER',
        title=f"⚡ ارتقای مهارت: {player.name}",
        message=f"مهارت «{matched_spec['name']}» بازیکن {player.name} با {cost} الماس به لول {new_lvl} (مقدار {current_pes} در PES) ارتقا یافت! (در انتظار اعمال در بازی توسط ادمین)"
    )

    breakdown = player.get_skills_breakdown(role=role)
    return True, f"مهارت «{matched_spec['name']}» با موفقیت به لول {new_lvl} ارتقا یافت! ✨", breakdown


def calculate_player_level_boost_gems(player) -> int:
    """
    Calculates total gems spent to bring a player from level 1 to current player.level.
    """
    current_lvl = getattr(player, 'level', 1) or 1
    if current_lvl <= 1:
        return 0
    return sum(GEM_BOOST_TIER_COSTS.get(lvl, 880) for lvl in range(1, current_lvl))


def calculate_player_skills_boost_gems(player) -> int:
    """
    Calculates total gems spent on specialized skills in player.skills_data.
    """
    skills_data = dict(getattr(player, 'skills_data', {}) or {})
    total = 0
    for k, item in skills_data.items():
        if k.startswith('__') or not isinstance(item, dict):
            continue
        skill_lvl = item.get('level', 0)
        for lvl in range(skill_lvl):
            total += get_pes_skill_upgrade_cost(lvl)
    return total


def admin_mark_pes_ovr_applied(player_id: int, applied: bool = True) -> tuple:
    """
    Marks the player's overall (OVR) gem boost as applied or pending in PES.
    """
    from teams.models import Player
    try:
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return False, "بازیکن یافت نشد."

    skills_data = dict(player.skills_data or {})
    skills_data['__pes_ovr_applied__'] = bool(applied)
    player.skills_data = skills_data
    player.save(update_fields=['skills_data'])
    return True, "وضعیت اعمال اورال در بازی PES با موفقیت به‌روزرسانی شد."


def admin_mark_pes_skill_applied(player_id: int, skill_key: str = None, all_skills: bool = False) -> tuple:
    """
    Marks a single skill or all skills (plus OVR boost) of a player as applied in PES.
    """
    from teams.models import Player
    try:
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return False, "بازیکن یافت نشد."

    skills_data = dict(player.skills_data or {})

    if all_skills:
        for k, v in skills_data.items():
            if isinstance(v, dict):
                v['pes_applied'] = True
                v['applied_at'] = timezone.now().isoformat()
        skills_data['__pes_ovr_applied__'] = True
    elif skill_key:
        if skill_key not in skills_data or not isinstance(skills_data[skill_key], dict):
            return False, f"مهارت {skill_key} یافت نشد."
        skills_data[skill_key]['pes_applied'] = True
        skills_data[skill_key]['applied_at'] = timezone.now().isoformat()
    else:
        return False, "کلید مهارت مشخص نشده است."

    player.skills_data = skills_data
    player.save(update_fields=['skills_data'])
    return True, "وضعیت با موفقیت به «اعمال‌شده در بازی PES» تغییر یافت."


def admin_update_player_ovr(player_id: int, new_ovr: int) -> tuple:
    """
    Allows the admin to set the new OVR calculated by PES edit mode.
    """
    from teams.models import Player
    if new_ovr < 40 or new_ovr > 99:
        return False, "اورال باید عددی بین ۴۰ تا ۹۹ باشد."

    try:
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return False, "بازیکن یافت نشد."

    old_ovr = player.overall
    player.overall = new_ovr
    player.save(update_fields=['overall'])

    if player.team:
        try:
            player.team.update_star_rating(save=True)
        except Exception:
            pass

    return True, f"اورال {player.name} از {old_ovr} به {new_ovr} با موفقیت به‌روزرسانی شد."


def admin_reset_player_boosts(player_id: int, reset_mode: str = 'ALL') -> tuple:
    """
    Resets boosts for a player and atomically refunds the exact spent gems to their club wallet.
    reset_mode: 'ALL' (default) | 'SKILLS_ONLY' | 'LEVEL_ONLY'
    Returns (success: bool, message: str, refund_amount: int)
    """
    from teams.models import Player
    from economy.services import process_atomic_wallet_update
    from notifications.models import Notification

    try:
        player = Player.objects.select_related('team').get(id=player_id)
    except Player.DoesNotExist:
        return False, "بازیکن یافت نشد.", 0

    team = player.team
    if not team:
        return False, "بازیکن در حال حاضر عضو تیمی نیست.", 0

    level_gems = calculate_player_level_boost_gems(player)
    skills_gems = calculate_player_skills_boost_gems(player)

    if reset_mode == 'LEVEL_ONLY':
        refund_amount = level_gems
    elif reset_mode == 'SKILLS_ONLY':
        refund_amount = skills_gems
    else:  # 'ALL'
        refund_amount = level_gems + skills_gems

    if refund_amount < 0:
        refund_amount = 0

    update_fields = []

    if reset_mode in ['LEVEL_ONLY', 'ALL']:
        player.level = 1
        player.xp = 0
        if player.base_overall:
            player.overall = player.base_overall
        update_fields.extend(['level', 'xp', 'overall'])

    if reset_mode in ['SKILLS_ONLY', 'ALL']:
        player.skills_data = {}
        update_fields.append('skills_data')
    elif reset_mode == 'LEVEL_ONLY':
        skills_data = dict(player.skills_data or {})
        skills_data.pop('__pes_ovr_applied__', None)
        player.skills_data = skills_data
        update_fields.append('skills_data')

    if update_fields:
        player.save(update_fields=list(set(update_fields)))

    # Refund gems to club wallet atomically
    if refund_amount > 0:
        wallet_res = process_atomic_wallet_update(
            team_id=team.id,
            amount=refund_amount,
            currency='GEMS',
            transaction_type='REFUND',
            description=f"استرداد {refund_amount} جم بابت ریست تقویت‌های بازیکن {player.name} ({reset_mode})"
        )
        if not wallet_res.get('success'):
            return False, f"خطا در شارژ کیف پول باشگاه: {wallet_res.get('message', 'خطای نامشخص')}", 0

    # Recalculate team star rating
    try:
        team.update_star_rating(save=True)
    except Exception:
        pass

    # Send Notification to coach
    try:
        Notification.objects.create(
            team=team,
            category='GENERAL',
            title=f"💎 استرداد جم: ریست تقویت‌های {player.name}",
            message=f"تقویت‌های بازیکن {player.name} با موفقیت ریست شد و تعداد {refund_amount} الماس (جم) به خزانه باشگاه {team.name} بازگردانده شد."
        )
    except Exception:
        pass

    return True, f"تقویت‌های بازیکن {player.name} با موفقیت ریست شد و {refund_amount} الماس به حساب باشگاه مسترد گردید.", refund_amount


def admin_reset_team_boosts(team_id: int, reset_mode: str = 'ALL') -> tuple:
    """
    Resets all boosted players in a team and atomically refunds total spent gems to the club wallet.
    Returns (success: bool, message: str, total_refund: int)
    """
    from teams.models import Team
    from django.db import transaction
    from economy.services import process_atomic_wallet_update
    from notifications.models import Notification

    try:
        team = Team.objects.prefetch_related('players').get(id=team_id)
    except Team.DoesNotExist:
        return False, "تیم یافت نشد.", 0

    boosted_players = []
    total_refund = 0

    for p in team.players.all():
        lvl_gems = calculate_player_level_boost_gems(p)
        skl_gems = calculate_player_skills_boost_gems(p)

        has_lvl = (p.level > 1) or (p.overall > (p.base_overall or p.overall)) or lvl_gems > 0
        has_skl = len([s for s in (p.skills_data or {}).keys() if not s.startswith('__')]) > 0 or skl_gems > 0

        if reset_mode == 'LEVEL_ONLY' and has_lvl:
            boosted_players.append((p, lvl_gems))
            total_refund += lvl_gems
        elif reset_mode == 'SKILLS_ONLY' and has_skl:
            boosted_players.append((p, skl_gems))
            total_refund += skl_gems
        elif reset_mode == 'ALL' and (has_lvl or has_skl):
            p_refund = lvl_gems + skl_gems
            boosted_players.append((p, p_refund))
            total_refund += p_refund

    if not boosted_players:
        return False, "هیچ بازیکن تقویت‌شده‌ای با شرایط انتخابی در این تیم یافت نشد.", 0

    with transaction.atomic():
        for p, _ in boosted_players:
            update_fields = []
            if reset_mode in ['LEVEL_ONLY', 'ALL']:
                p.level = 1
                p.xp = 0
                if p.base_overall:
                    p.overall = p.base_overall
                update_fields.extend(['level', 'xp', 'overall'])

            if reset_mode in ['SKILLS_ONLY', 'ALL']:
                p.skills_data = {}
                update_fields.append('skills_data')
            elif reset_mode == 'LEVEL_ONLY':
                s_data = dict(p.skills_data or {})
                s_data.pop('__pes_ovr_applied__', None)
                p.skills_data = s_data
                update_fields.append('skills_data')

            p.save(update_fields=list(set(update_fields)))

        if total_refund > 0:
            wallet_res = process_atomic_wallet_update(
                team_id=team.id,
                amount=total_refund,
                currency='GEMS',
                transaction_type='REFUND',
                description=f"استرداد گروهی {total_refund} جم بابت ریست کلیه بازیکنان تیم {team.name} ({len(boosted_players)} بازیکن)"
            )
            if not wallet_res.get('success'):
                raise Exception(f"خطا در شارژ کیف پول باشگاه: {wallet_res.get('message', 'خطای نامشخص')}")

        try:
            team.update_star_rating(save=True)
        except Exception:
            pass

        try:
            Notification.objects.create(
                team=team,
                category='GENERAL',
                title=f"💎 استرداد جم گروهی تیم {team.name}",
                message=f"تقویت‌های {len(boosted_players)} بازیکن تیم ریست شد و مجموعاً {total_refund} الماس به صندوق باشگاه بازگشت."
            )
        except Exception:
            pass

    return True, f"تقویت‌های {len(boosted_players)} بازیکن تیم با موفقیت ریست شد و مجموعاً {total_refund} الماس به حساب باشگاه عودت گردید.", total_refund


def admin_get_pes_skills_overview(team_id: int = None) -> dict:
    """
    Returns teams categorized with their players who have upgraded skills or level boosts,
    along with pending vs applied counters and invested gems for the admin dashboard.
    """
    from teams.models import Team
    teams_qs = Team.objects.prefetch_related('players').all().order_by('name')
    if team_id:
        teams_qs = teams_qs.filter(id=team_id)

    teams_data = []
    total_pending_all = 0
    total_upgraded_players_all = 0

    for t in teams_qs:
        players = t.players.all().order_by('-overall')
        team_players_data = []
        team_pending_count = 0
        team_total_gems = 0

        for p in players:
            try:
                skills = p.get_skills_breakdown()
            except Exception:
                skills = []

            trained_skills = [s for s in skills if s.get('level', 0) > 0]
            
            base_ovr = p.base_overall or p.overall
            is_level_boosted = (p.level > 1) or (p.overall > base_ovr)
            
            level_gems = calculate_player_level_boost_gems(p)
            skills_gems = calculate_player_skills_boost_gems(p)
            player_total_gems = level_gems + skills_gems

            skills_data = dict(p.skills_data or {})
            pes_ovr_applied = skills_data.get('__pes_ovr_applied__', not is_level_boosted)

            pending_skills = [s for s in trained_skills if not s.get('pes_applied', False)]
            pending_ovr_count = 1 if (is_level_boosted and not pes_ovr_applied) else 0

            player_pending_count = len(pending_skills) + pending_ovr_count
            has_pending = player_pending_count > 0

            # Only include player if they have any boost (Level Gem Boost OR Position Skills)
            if not (is_level_boosted or len(trained_skills) > 0 or player_total_gems > 0):
                continue

            team_pending_count += player_pending_count
            team_total_gems += player_total_gems

            custom_photo_url = None
            if getattr(p, 'custom_photo', None):
                try:
                    custom_photo_url = p.custom_photo.url
                except Exception:
                    custom_photo_url = str(p.custom_photo)

            team_players_data.append({
                'id': p.id,
                'name': p.name,
                'position': p.position or '',
                'overall': p.overall,
                'base_overall': base_ovr,
                'level': p.level,
                'is_level_boosted': is_level_boosted,
                'level_gems': level_gems,
                'skills_gems': skills_gems,
                'total_gems_spent': player_total_gems,
                'pes_ovr_applied': pes_ovr_applied,
                'shirt_number': p.shirt_number,
                'photo_url': custom_photo_url,
                'is_from_pack': ('packs/' in (custom_photo_url or '')) or (hasattr(p, 'from_pack_session') and p.from_pack_session.exists()),
                'pack_tier': p.rarity if p.rarity in ['LEGENDARY', 'EPIC', 'RARE'] else 'LEGENDARY',
                'has_pending': has_pending,
                'pending_count': player_pending_count,
                'pending_ovr_count': pending_ovr_count,
                'pending_skills_count': len(pending_skills),
                'skills': skills,
                'trained_skills': trained_skills,
            })

        if team_players_data:
            total_upgraded_players_all += len(team_players_data)
            total_pending_all += team_pending_count

        teams_data.append({
            'id': t.id,
            'name': t.name,
            'logo': t.logo,  # CharField string: safe for frontend getTeamLogoUrl
            'pending_count': team_pending_count,
            'players_count': len(team_players_data),
            'total_gems_invested': team_total_gems,
            'players': team_players_data
        })

    return {
        'total_pending': total_pending_all,
        'total_upgraded_players': total_upgraded_players_all,
        'teams': teams_data
    }

