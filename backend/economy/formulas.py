from decimal import Decimal
from django.utils import timezone

BASE_MATCH_REWARD = Decimal('5000.00')

REWARD_WIN = Decimal('8000.00')
REWARD_DRAW = Decimal('3000.00')
REWARD_LOSS = Decimal('1000.00')
REWARD_PER_GOAL = Decimal('500.00')
REWARD_CLEAN_SHEET = Decimal('1500.00')

WEEKLY_SOFT_CAP = Decimal('40000.00')
SOFT_CAP_DECAY = Decimal('0.35')  # 35% after cap

WEEKLY_TASK_GEM_REWARD = 15
SEASON_PASS_LEVEL_GEM_REWARD = 8
CUP_WIN_GEM_REWARD = 50


def calculate_match_reward(team, match_result: str, goals_scored: int, clean_sheet: bool) -> Decimal:
    reward = BASE_MATCH_REWARD
    reward += {'WIN': REWARD_WIN, 'DRAW': REWARD_DRAW, 'LOSS': REWARD_LOSS}[match_result]
    reward += REWARD_PER_GOAL * goals_scored
    if clean_sheet:
        reward += REWARD_CLEAN_SHEET
    return reward


def apply_weekly_soft_cap(team, raw_reward: Decimal, week_start) -> Decimal:
    from economy.models import Transaction
    from django.db import models as dj_models
    
    earned_this_week = Transaction.objects.filter(
        team=team, currency='BUDGET', transaction_type='MATCH_REWARD',
        created_at__gte=week_start
    ).aggregate(total=dj_models.Sum('amount'))['total'] or Decimal('0.00')

    remaining_before_cap = max(Decimal('0.00'), WEEKLY_SOFT_CAP - earned_this_week)

    if raw_reward <= remaining_before_cap:
        return raw_reward
    over_cap = raw_reward - remaining_before_cap
    return remaining_before_cap + (over_cap * SOFT_CAP_DECAY)
