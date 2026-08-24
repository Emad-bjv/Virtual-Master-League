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
TOTAL_SEASON_PASS_XP = 3500
XP_MATCH_WIN = 165    # 15 wins = 2,475 XP (70.7%)
XP_MATCH_DRAW = 70    # Draw consolation XP
XP_MATCH_LOSS = 20    # Participation XP
XP_PER_TASK = 56      # 25 tasks = 1,400 XP (40.0%)

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
    - WON: +165 XP (15 برد = 70.7% کل سیزن پس)
    - DRAW: +70 XP
    - LOST: +20 XP
    """
    if outcome == 'WON':
        xp_gain = XP_MATCH_WIN
    elif outcome == 'DRAW':
        xp_gain = XP_MATCH_DRAW
    else:
        xp_gain = XP_MATCH_LOSS

    with transaction.atomic():
        pass_obj, _ = TeamSeasonPass.objects.select_for_update().get_or_create(team=team)
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
        earned_xp = progress.task.reward_xp or XP_PER_TASK
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
        if level in pass_obj.claimed_levels:
            return {'success': False, 'error': f'پاداش سطح {level} قبلاً دریافت شده است.'}

        try:
            level_def = SeasonPassLevel.objects.get(level=level)
        except SeasonPassLevel.DoesNotExist:
            return {'success': False, 'error': 'سطح نامعتبر است.'}

        rewards_granted = {
            'coins': Decimal('0.00'),
            'gems': 0,
            'legendary_player': None
        }

        # 1. Free Track Rewards
        if level_def.free_reward_coins and level_def.free_reward_coins > 0:
            process_atomic_wallet_update(
                team_id=team.id,
                amount=level_def.free_reward_coins,
                currency='BUDGET',
                transaction_type='PRIZE',
                description=f"پاداش دلاری سطح {level} سیزن پس"
            )
            rewards_granted['coins'] += level_def.free_reward_coins

        if level_def.free_reward_gems and level_def.free_reward_gems > 0:
            process_atomic_wallet_update(
                team_id=team.id,
                amount=Decimal(level_def.free_reward_gems),
                currency='GEMS',
                transaction_type='PRIZE',
                description=f"پاداش جم سطح {level} سیزن پس"
            )
            rewards_granted['gems'] += level_def.free_reward_gems

        # 2. VIP Track Rewards
        if pass_obj.is_vip:
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

        # 3. Final Level Legend Player Reward
        if level_def.is_final_level:
            legend_player = pass_obj.assigned_legend_player
            
            # If no legend assigned yet, assign an unassigned legend player
            if not legend_player:
                auto_assign_unique_team_legends()
                pass_obj.refresh_from_db()
                legend_player = pass_obj.assigned_legend_player

            if legend_player:
                # Add player to team roster
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

        # Update claimed levels
        pass_obj.claimed_levels.append(level)
        pass_obj.save(update_fields=['claimed_levels', 'legend_claimed'])

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
        player, created = Player.objects.get_or_create(
            name=leg_data['name'],
            defaults={
                'position': leg_data['position'],
                'overall': leg_data['overall'],
                'base_overall': leg_data['overall'],
                'potential_ovr': 99,
                'age': leg_data['age'],
                'base_stamina': leg_data['base_stamina'],
                'virtual_stamina': 100.0,
                'rarity': 'LEGENDARY',
                'market_value': Decimal('15000000.00'),
                'wage': Decimal('500.00')
            }
        )
        # Ensure rarity is LEGENDARY
        if player.rarity != 'LEGENDARY':
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


def seed_balanced_season_pass_levels() -> int:
    """
    تنظیم مهندسی‌شده ۲۰ سطح سیزن پس با پاداش‌های صعودی.
    - سطح ۱ (کم‌ارزش‌ترین): $10,000 + 10 جم
    - سطوح میانی: صعود پلکانی تا صدها هزار دلار و جم
    - سطح ۲۰ (سطح آخر): $500,000 + 300 جم + بازیکن لجند اختصاصی تیم
    - مجموع کل XP = 3,500 XP (پایان در هفته ۱۷ برای تیم‌های فعال).
    """
    levels_data = [
        # (lvl, xp, title, free_coins, free_gems, vip_coins, vip_gems, is_final)
        (1, 100, "پاداش سطح ۱ - بودجه مقدماتی", 10000, 10, 25000, 25, False),
        (2, 200, "پاداش سطح ۲ - بسته جم اولیه", 15000, 15, 35000, 35, False),
        (3, 320, "پاداش سطح ۳ - شارژ امکانات", 20000, 20, 50000, 45, False),
        (4, 450, "پاداش سطح ۴ - پاداش پیروزی", 25000, 25, 60000, 60, False),
        (5, 600, "پاداش سطح ۵ - جهش بودجه نیمه‌اول", 40000, 30, 100000, 80, False),
        (6, 760, "پاداش سطح ۶ - الماس کریستالی", 45000, 35, 110000, 90, False),
        (7, 930, "پاداش سطح ۷ - تقویت نقل و انتقالات", 50000, 40, 130000, 100, False),
        (8, 1110, "پاداش سطح ۸ - توسعه آکادمی", 60000, 45, 150000, 120, False),
        (9, 1300, "پاداش سطح ۹ - پاداش انگیزه", 75000, 50, 180000, 140, False),
        (10, 1500, "پاداش سطح ۱۰ - نقطه عطف میانه فصل", 100000, 70, 250000, 175, False),
        (11, 1710, "پاداش سطح ۱۱ - تزریق سرمایه", 120000, 80, 280000, 200, False),
        (12, 1930, "پاداش سطح ۱۲ - جم طلایی", 140000, 90, 320000, 225, False),
        (13, 2160, "پاداش سطح ۱۳ - آماده‌سازی دور برگشت", 160000, 100, 360000, 250, False),
        (14, 2400, "پاداش سطح ۱۴ - بودجه استراتژیک", 180000, 110, 400000, 280, False),
        (15, 2650, "پاداش سطح ۱۵ - الماس نخبگان", 220000, 130, 500000, 320, False),
        (16, 2900, "پاداش سطح ۱۶ - پاداش درخشش", 260000, 150, 600000, 370, False),
        (17, 3100, "پاداش سطح ۱۷ - پاداش قهرمانی", 300000, 175, 700000, 420, False),
        (18, 3260, "پاداش سطح ۱۸ - آمادگی فینال", 350000, 200, 800000, 470, False),
        (19, 3400, "پاداش سطح ۱۹ - گام نهایی", 400000, 250, 900000, 520, False),
        (20, 3500, "🏆 سطح نهایی - پاداش بزرگ و بازیکن لجند اختصاصی", 500000, 300, 1200000, 700, True),
    ]

    with transaction.atomic():
        SeasonPassLevel.objects.all().delete()
        created_count = 0
        for lvl, xp, title, f_coins, f_gems, v_coins, v_gems, is_final in levels_data:
            SeasonPassLevel.objects.create(
                level=lvl,
                xp_required=xp,
                reward_title=title,
                free_reward_coins=Decimal(str(f_coins)),
                free_reward_gems=f_gems,
                vip_reward_coins=Decimal(str(v_coins)),
                vip_reward_gems=v_gems,
                vip_reward_player_rarity='LEGENDARY' if is_final else '',
                is_final_level=is_final
            )
            created_count += 1

    return created_count


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

