from django.db import transaction
from .models import TeamTaskProgress, TeamSeasonPass, SeasonPassLevel

def increment_task_progress(team, task_type: str, amount: int = 1):
    """
    صدا زده می‌شود از:
    - matches/tasks.py بعد از پایان بازی (WIN_MATCHES, SCORE_GOALS, CLEAN_SHEETS)
    - teams/views.py submit_gameplan (SUBMIT_LINEUP)
    - gacha/services.py open_gacha_pack (OPEN_PACKS)
    """
    active_tasks = TeamTaskProgress.objects.filter(
        team=team, task__task_type=task_type, task__is_active=True, is_completed=False
    ).select_related('task')

    for progress in active_tasks:
        progress.current_value += amount
        if progress.current_value >= progress.task.target_value:
            progress.is_completed = True
        progress.save(update_fields=['current_value', 'is_completed'])


def claim_task_reward(team, task_progress_id: int) -> dict:
    with transaction.atomic():
        try:
            progress = TeamTaskProgress.objects.select_for_update().get(id=task_progress_id, team=team)
        except TeamTaskProgress.DoesNotExist:
            return {'success': False, 'error': 'تسک یافت نشد.'}
            
        if not progress.is_completed:
            return {'success': False, 'error': 'تسک هنوز کامل نشده است.'}
        if progress.is_claimed:
            return {'success': False, 'error': 'قبلاً دریافت شده است.'}

        progress.is_claimed = True
        progress.save(update_fields=['is_claimed'])

        pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=team)
        pass_obj.current_xp += progress.task.reward_xp
        _recalculate_level(pass_obj)
        pass_obj.save()

        return {'success': True, 'new_xp': pass_obj.current_xp, 'new_level': pass_obj.current_level}


def _recalculate_level(pass_obj: TeamSeasonPass):
    eligible_level = SeasonPassLevel.objects.filter(
        xp_required__lte=pass_obj.current_xp
    ).order_by('-level').first()
    if eligible_level:
        pass_obj.current_level = eligible_level.level


def claim_level_reward(team, level: int) -> dict:
    """دریافت جایزه‌ی یک سطح خاص (رایگان یا VIP)."""
    from economy.services import process_atomic_wallet_update
    from gacha.services import generate_random_player
    from decimal import Decimal

    with transaction.atomic():
        try:
            pass_obj = TeamSeasonPass.objects.select_for_update().get(team=team)
        except TeamSeasonPass.DoesNotExist:
            return {'success': False, 'error': 'پاس فصلی برای تیم یافت نشد.'}

        if level > pass_obj.current_level:
            return {'success': False, 'error': 'هنوز به این سطح نرسیده‌اید.'}
        if level in pass_obj.claimed_levels:
            return {'success': False, 'error': 'قبلاً دریافت شده است.'}

        try:
            level_def = SeasonPassLevel.objects.get(level=level)
        except SeasonPassLevel.DoesNotExist:
            return {'success': False, 'error': 'سطح نامعتبر است.'}

        # Issue Free Rewards
        if level_def.free_reward_gems:
            process_atomic_wallet_update(team.id, Decimal(level_def.free_reward_gems), 'GEMS', 'PRIZE', f"پاداش سطح {level} پاس فصلی")

        # Issue VIP Rewards
        if pass_obj.is_vip and level_def.vip_reward_gems:
            process_atomic_wallet_update(team.id, Decimal(level_def.vip_reward_gems), 'GEMS', 'PRIZE', f"پاداش VIP سطح {level}")

        response_data = {'success': True}

        if level_def.is_final_level and pass_obj.is_vip and level_def.vip_reward_player_rarity:
            player = generate_random_player(level_def.vip_reward_player_rarity, team)
            response_data['legendary_player'] = player.name

        pass_obj.claimed_levels.append(level)
        pass_obj.save(update_fields=['claimed_levels'])
        
        return response_data
