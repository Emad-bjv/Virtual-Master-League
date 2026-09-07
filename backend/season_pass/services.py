import random
from decimal import Decimal
from django.db import transaction
from .models import TeamTaskProgress, TeamSeasonPass, SeasonPassLevel, WeeklyTask
from teams.models import Team, Player

# ─────────────────────────────────────────────────────────────────────────────
# EXACT PROGRESSION & XP BALANCE CONSTANTS
# Total Season Pass XP: 3,500 XP across 20 tiers (~175 XP / tier)
# 15 Wins (Half of 30 games) = 2,475 XP (70.7% of Season Pass)
# 25 Tasks (Half of 50 tasks) = 1,400 XP (40.0% of Season Pass)
# Combined: 15 Wins + 25 Tasks = 3,875 XP (> 100%, completing by Week 17!)
# ─────────────────────────────────────────────────────────────────────────────
TOTAL_SEASON_PASS_XP = 4100
XP_MATCH_WIN = 75    # 1 win = 75 XP (far below Level 1 threshold of 200 XP; requires ~3 wins)
XP_MATCH_DRAW = 30   # Draw consolation XP
XP_MATCH_LOSS = 10   # Participation XP
XP_PER_TASK = 45     # Weekly task reward XP

ICONIC_LEGENDS_DATA = [
    {"name": "Z. Zidane", "position": "AMF", "overall": 93, "age": 28, "base_stamina": 92},
    {"name": "R. Nazário", "position": "CF", "overall": 93, "age": 25, "base_stamina": 90},
    {"name": "Ronaldinho", "position": "LWF", "overall": 92, "age": 26, "base_stamina": 91},
    {"name": "P. Maldini", "position": "CB", "overall": 93, "age": 29, "base_stamina": 93},
    {"name": "T. Henry", "position": "CF", "overall": 92, "age": 27, "base_stamina": 92},
    {"name": "D. Bergkamp", "position": "SS", "overall": 91, "age": 28, "base_stamina": 89},
    {"name": "S. Gerrard", "position": "CMF", "overall": 91, "age": 27, "base_stamina": 94},
    {"name": "A. Pirlo", "position": "DMF", "overall": 91, "age": 29, "base_stamina": 88},
    {"name": "J. Cruyff", "position": "SS", "overall": 93, "age": 27, "base_stamina": 91},
    {"name": "D. Maradona", "position": "AMF", "overall": 94, "age": 26, "base_stamina": 90},
    {"name": "Pelé", "position": "CF", "overall": 94, "age": 25, "base_stamina": 92},
    {"name": "R. Baggio", "position": "SS", "overall": 92, "age": 27, "base_stamina": 89},
    {"name": "A. Del Piero", "position": "SS", "overall": 91, "age": 26, "base_stamina": 90},
    {"name": "P. Nedvěd", "position": "LMF", "overall": 91, "age": 28, "base_stamina": 95},
    {"name": "C. Puyol", "position": "CB", "overall": 91, "age": 28, "base_stamina": 94},
    {"name": "Xavi", "position": "CMF", "overall": 92, "age": 28, "base_stamina": 91},
    {"name": "Iniesta", "position": "CMF", "overall": 92, "age": 26, "base_stamina": 90},
    {"name": "Raúl", "position": "CF", "overall": 91, "age": 27, "base_stamina": 91},
    {"name": "Kaká", "position": "AMF", "overall": 92, "age": 25, "base_stamina": 92},
    {"name": "A. Shevchenko", "position": "CF", "overall": 91, "age": 28, "base_stamina": 91},
    {"name": "I. Casillas", "position": "GK", "overall": 92, "age": 27, "base_stamina": 92},
    {"name": "O. Kahn", "position": "GK", "overall": 92, "age": 30, "base_stamina": 93},
    {"name": "F. Baresi", "position": "CB", "overall": 92, "age": 29, "base_stamina": 92},
    {"name": "R. Carlos", "position": "LB", "overall": 91, "age": 26, "base_stamina": 95},
]


def add_match_season_pass_xp(team: Team, outcome: str = 'WON') -> int:
    """
    اعطای مستقیم XP مسابقه به سیزن پس تیم بعد از پایان بازی.
    - تیم‌های عادی: WON: +75 XP, DRAW: +30 XP, LOST: +10 XP
    - تیم‌های VIP: ضریب ۱.۵ برابری (+۵۰٪ بوست): WON: +112 XP, DRAW: +45 XP, LOST: +15 XP
    """
    with transaction.atomic():
        pass_obj, _ = TeamSeasonPass.objects.select_for_update().get_or_create(team=team)

        if outcome == 'WON':
            base_xp = XP_MATCH_WIN
        elif outcome == 'DRAW':
            base_xp = XP_MATCH_DRAW
        else:
            base_xp = XP_MATCH_LOSS

        multiplier = 1.5 if pass_obj.is_vip else 1.0
        xp_gain = int(round(base_xp * multiplier))

        pass_obj.current_xp += xp_gain
        _recalculate_level(pass_obj)
        pass_obj.save(update_fields=['current_xp', 'current_level'])

    return xp_gain


def increment_task_progress(team: Team, task_type: str, amount: int = 1):
    """
    افزایش پیشرفت تسک‌های فعال تیم (WIN_MATCHES, SCORE_GOALS, CLEAN_SHEETS, SUBMIT_LINEUP, OPEN_PACKS).
    """
    active_tasks = TeamTaskProgress.objects.filter(
        team=team, task__task_type=task_type, task__is_active=True, is_completed=False
    ).select_related('task')

    for progress in active_tasks:
        progress.current_value += amount
        if progress.current_value >= progress.task.target_value:
            progress.is_completed = True
        progress.save(update_fields=['current_value', 'is_completed'])


def claim_task_reward(team: Team, task_progress_id: int) -> dict:
    """
    دریافت جایزه XP تسک تکمیل‌شده (+56 XP به ازای هر تسک).
    """
    with transaction.atomic():
        try:
            progress = TeamTaskProgress.objects.select_for_update().get(id=task_progress_id, team=team)
        except TeamTaskProgress.DoesNotExist:
            return {'success': False, 'error': 'تسک یافت نشد.'}
            
        if not progress.is_completed:
            return {'success': False, 'error': 'تسک هنوز کامل نشده است.'}
        if progress.is_claimed:
            return {'success': False, 'error': 'این تسک قبلاً دریافت شده است.'}

        progress.is_claimed = True
        progress.save(update_fields=['is_claimed'])

        pass_obj, _ = TeamSeasonPass.objects.select_for_update().get_or_create(team=team)
        base_xp = progress.task.reward_xp or XP_PER_TASK
        multiplier = 1.5 if pass_obj.is_vip else 1.0
        earned_xp = int(round(base_xp * multiplier))
        pass_obj.current_xp += earned_xp
        _recalculate_level(pass_obj)
        pass_obj.save(update_fields=['current_xp', 'current_level'])

        return {
            'success': True,
            'earned_xp': earned_xp,
            'new_xp': pass_obj.current_xp,
            'new_level': pass_obj.current_level
        }


def _recalculate_level(pass_obj: TeamSeasonPass):
    """
    محاسبه سطح جاری تیم بر اساس مجموع XP کسب‌شده.
    """
    eligible_level = SeasonPassLevel.objects.filter(
        xp_required__lte=pass_obj.current_xp
    ).order_by('-level').first()
    if eligible_level:
        pass_obj.current_level = eligible_level.level
    else:
        pass_obj.current_level = 1


def claim_level_reward(team: Team, level: int) -> dict:
    """
    دریافت پاداش سطح خاص.
    پاداش‌ها صرفاً شامل دلار، جم و در سطح آخر بازیکن لجند اختصاصی و غیرتکراری تیم است.
    """
    from economy.services import process_atomic_wallet_update

    with transaction.atomic():
        try:
            pass_obj = TeamSeasonPass.objects.select_for_update().get(team=team)
        except TeamSeasonPass.DoesNotExist:
            return {'success': False, 'error': 'پاس فصلی برای تیم یافت نشد.'}

        if level > pass_obj.current_level:
            return {'success': False, 'error': f'هنوز به سطح {level} نرسیده‌اید.'}
        # Check what can be claimed:
        can_claim_free = level not in (pass_obj.claimed_levels or [])
        can_claim_vip = pass_obj.is_vip and (level not in (pass_obj.claimed_vip_levels or []))

        if not can_claim_free and not can_claim_vip:
            return {'success': False, 'error': f'تمام پاداش‌های سطح {level} قبلاً دریافت شده است.'}

        try:
            level_def = SeasonPassLevel.objects.get(level=level)
        except SeasonPassLevel.DoesNotExist:
            return {'success': False, 'error': 'سطح نامعتبر است.'}

        rewards_granted = {
            'coins': Decimal('0.00'),
            'gems': 0,
            'legendary_player': None
        }

        # 1. Free Track Rewards (if not claimed yet)
        if can_claim_free:
            if level_def.free_reward_coins and level_def.free_reward_coins > 0:
                process_atomic_wallet_update(
                    team_id=team.id,
                    amount=level_def.free_reward_coins,
                    currency='BUDGET',
                    transaction_type='PRIZE',
                    description=f"پاداش دلاری سطح {level} سیزن پس"
                )
                rewards_granted['coins'] += level_def.free_reward_coins

            if pass_obj.claimed_levels is None:
                pass_obj.claimed_levels = []
            pass_obj.claimed_levels.append(level)

        # 2. VIP Track Rewards (if VIP and not claimed yet)
        if can_claim_vip:
            if level_def.vip_reward_coins and level_def.vip_reward_coins > 0:
                process_atomic_wallet_update(
                    team_id=team.id,
                    amount=level_def.vip_reward_coins,
                    currency='BUDGET',
                    transaction_type='PRIZE',
                    description=f"پاداش دلاری VIP سطح {level} سیزن پس"
                )
                rewards_granted['coins'] += level_def.vip_reward_coins

            if level_def.vip_reward_gems and level_def.vip_reward_gems > 0:
                process_atomic_wallet_update(
                    team_id=team.id,
                    amount=Decimal(level_def.vip_reward_gems),
                    currency='GEMS',
                    transaction_type='PRIZE',
                    description=f"پاداش جم VIP سطح {level} سیزن پس"
                )
                rewards_granted['gems'] += level_def.vip_reward_gems

            # 3. Final Level Legend Player Reward (VIP Exclusive!)
            if level_def.is_final_level and not pass_obj.legend_claimed:
                legend_player = pass_obj.assigned_legend_player
                if not legend_player:
                    auto_assign_unique_team_legends()
                    pass_obj.refresh_from_db()
                    legend_player = pass_obj.assigned_legend_player

                if legend_player:
                    legend_player.team = team
                    legend_player.save(update_fields=['team'])
                    pass_obj.legend_claimed = True
                    rewards_granted['legendary_player'] = {
                        'id': legend_player.id,
                        'name': legend_player.name,
                        'position': legend_player.position,
                        'overall': legend_player.overall,
                        'age': legend_player.age,
                        'rarity': 'LEGENDARY'
                    }

            if pass_obj.claimed_vip_levels is None:
                pass_obj.claimed_vip_levels = []
            pass_obj.claimed_vip_levels.append(level)

        pass_obj.save(update_fields=['claimed_levels', 'claimed_vip_levels', 'legend_claimed'])

        return {
            'success': True,
            'level': level,
            'rewards': rewards_granted,
            'message': f"پاداش سطح {level} با موفقیت دریافت شد."
        }


def auto_assign_unique_team_legends() -> dict:
    """
    تخصیص هوشمند، خودکار و ۱۰۰٪ غیرتکراری بازیکنان لجند به تمام تیم‌های لیگ.
    تضمین می‌کند هیچ دو تیمی بازیکن لجند یکسان نداشته باشند.
    """
    teams = list(Team.objects.all().order_by('id'))
    if not teams:
        return {'success': False, 'message': 'تیمی در سیستم یافت نشد.'}

    # Ensure legend players exist in database
    created_or_found_legends = []
    for leg_data in ICONIC_LEGENDS_DATA:
        player = Player.objects.filter(name=leg_data['name']).first()
        if not player:
            player = Player.objects.create(
                name=leg_data['name'],
                position=leg_data['position'],
                overall=leg_data['overall'],
                base_overall=leg_data['overall'],
                potential_ovr=99,
                age=leg_data['age'],
                base_stamina=leg_data['base_stamina'],
                virtual_stamina=100.0,
                rarity='LEGENDARY',
                market_value=Decimal('15000000.00'),
                wage=Decimal('500.00')
            )
        elif player.rarity != 'LEGENDARY':
            player.rarity = 'LEGENDARY'
            player.save(update_fields=['rarity'])
        created_or_found_legends.append(player)

    # Collect already assigned legends to preserve manual assignments if valid
    used_player_ids = set()
    for team in teams:
        pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=team)
        if pass_obj.assigned_legend_player_id:
            used_player_ids.add(pass_obj.assigned_legend_player_id)

    available_pool = [p for p in created_or_found_legends if p.id not in used_player_ids]
    random.shuffle(available_pool)

    assignments_made = 0
    with transaction.atomic():
        for team in teams:
            pass_obj, _ = TeamSeasonPass.objects.select_for_update().get_or_create(team=team)
            # If not assigned or if assigned player has a duplicate conflict
            if not pass_obj.assigned_legend_player:
                if available_pool:
                    chosen_player = available_pool.pop()
                    pass_obj.assigned_legend_player = chosen_player
                    pass_obj.save(update_fields=['assigned_legend_player'])
                    assignments_made += 1

    return {
        'success': True,
        'assigned_count': assignments_made,
        'total_teams': len(teams),
        'message': f"بازیکنان لجند یکتا برای {len(teams)} تیم با موفقیت تنظیم شدند."
    }


XP_REQUIRED_PER_LEVEL = [
    200, 380, 560, 740, 930, 1120, 1320, 1520, 1730, 1940,
    2150, 2360, 2580, 2800, 3020, 3240, 3460, 3680, 3900, 4100
]


def batch_configure_season_pass_levels(
    initial_vip_gems: int = 30,
    gem_slope: int = 35,
    initial_vip_coins: int = 35000,
    coin_slope: int = 60000,
    initial_free_coins: int = 10000,
    free_coin_slope: int = 25000,
    final_level_bonus_mult: float = 1.45
) -> int:
    """
    تنظیم فرمولی و دسته‌جمعی هر ۲۰ سطح سیزن‌پس با ورودی مقادیر پایه و شیب افزایش.
    امکان شخصی‌سازی کامل مقادیر توسط ادمین در یک کلیک.
    """
    levels_data = []
    for lvl in range(1, 21):
        step = lvl - 1
        xp = XP_REQUIRED_PER_LEVEL[step] if step < len(XP_REQUIRED_PER_LEVEL) else 200 * lvl
        is_final = (lvl == 20)

        f_coins = int(initial_free_coins + step * free_coin_slope)
        v_coins = int(initial_vip_coins + step * coin_slope)
        v_gems = int(initial_vip_gems + step * gem_slope)

        if is_final:
            v_coins = int(v_coins * final_level_bonus_mult)
            v_gems = int(v_gems * final_level_bonus_mult)
            title = "🏆 سطح نهایی - پاداش بزرگ و بازیکن لجند اختصاصی"
        else:
            title = f"پاداش مرحله {lvl}"

        levels_data.append((
            lvl, xp, title,
            Decimal(str(f_coins)),
            0,  # Free gems strictly 0
            Decimal(str(v_coins)),
            v_gems,
            is_final
        ))

    with transaction.atomic():
        SeasonPassLevel.objects.all().delete()
        created_count = 0
        for lvl, xp, title, f_coins, f_gems, v_coins, v_gems, is_final in levels_data:
            SeasonPassLevel.objects.create(
                level=lvl,
                xp_required=xp,
                reward_title=title,
                free_reward_coins=f_coins,
                free_reward_gems=f_gems,
                vip_reward_coins=v_coins,
                vip_reward_gems=v_gems,
                vip_reward_player_rarity='LEGENDARY' if is_final else '',
                is_final_level=is_final
            )
            created_count += 1

    return created_count


def seed_balanced_season_pass_levels() -> int:
    """
    تنظیم استاندارد مهندسی‌شده ۲۰ سطح صعودی سیزن‌پس با ارزش بالای VIP.
    """
    return batch_configure_season_pass_levels(
        initial_vip_gems=30,
        gem_slope=35,
        initial_vip_coins=35000,
        coin_slope=60000,
        initial_free_coins=10000,
        free_coin_slope=25000,
        final_level_bonus_mult=1.45
    )


def seed_season_weekly_tasks() -> int:
    """
    تولید ۵۰ تسک استاندارد برای ۳۰ هفته فصل مسابقات (ارزش هر تسک = ۵۶ XP).
    ۲۵ تسک = ۱,۴۰۰ XP (۴۰٪ کل سیزن پس).
    """
    task_templates = [
        ("برد در ۲ مسابقه", "WIN_MATCHES", 2),
        ("زدن ۵ گل در بازی‌ها", "SCORE_GOALS", 5),
        ("ثبت ترکیب رسمی قبل از بازی", "SUBMIT_LINEUP", 1),
        ("کسب ۱ کلین‌شیت", "CLEAN_SHEETS", 1),
    ]

    with transaction.atomic():
        WeeklyTask.objects.all().delete()
        TeamTaskProgress.objects.all().delete()

        created_count = 0
        teams = list(Team.objects.all())

        for week in range(1, 31):
            # Pick 2 tasks per week (60 tasks total across 30 weeks)
            chosen_templates = task_templates[(week % 2)::2]
            if not chosen_templates:
                chosen_templates = task_templates[:2]

            for title_base, task_type, target_val in chosen_templates:
                task = WeeklyTask.objects.create(
                    title=f"{title_base} (هفته {week})",
                    task_type=task_type,
                    target_value=target_val,
                    reward_xp=XP_PER_TASK,
                    week_number=week,
                    is_active=True
                )
                created_count += 1
                for team in teams:
                    TeamTaskProgress.objects.create(team=team, task=task)

    return created_count

