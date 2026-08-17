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
MATCH_WIN_GEM_REWARD = 10
UNDERDOG_WIN_GEM_BONUS = 15


def calculate_match_reward(team, match_result: str, goals_scored: int, clean_sheet: bool) -> Decimal:
    reward = BASE_MATCH_REWARD
    reward += {'WIN': REWARD_WIN, 'DRAW': REWARD_DRAW, 'LOSS': REWARD_LOSS}[match_result]
    reward += REWARD_PER_GOAL * goals_scored
    if clean_sheet:
        reward += REWARD_CLEAN_SHEET
    return reward


def calculate_match_gem_reward(team, opponent_team, match_result: str) -> dict:
    """
    Calculates gem rewards for match:
    - Base Win: 10 Gems
    - Underdog Win Bonus: +15 Gems (if opponent rating/squad overall is >= 2.0 higher)
    """
    if match_result != 'WIN':
        return {'total_gems': 0, 'base_gems': 0, 'underdog_gems': 0, 'is_underdog': False}

    from django.db.models import Avg
    base_gems = MATCH_WIN_GEM_REWARD
    underdog_gems = 0
    is_underdog = False

    if team and opponent_team:
        team_ovr = team.players.filter(is_starting=True).aggregate(avg=Avg('overall'))['avg']
        if team_ovr is None:
            team_ovr = team.players.aggregate(avg=Avg('overall'))['avg'] or 75.0

        opp_ovr = opponent_team.players.filter(is_starting=True).aggregate(avg=Avg('overall'))['avg']
        if opp_ovr is None:
            opp_ovr = opponent_team.players.aggregate(avg=Avg('overall'))['avg'] or 75.0

        if float(opp_ovr) >= float(team_ovr) + 2.0:
            is_underdog = True
            underdog_gems = UNDERDOG_WIN_GEM_BONUS

    return {
        'total_gems': base_gems + underdog_gems,
        'base_gems': base_gems,
        'underdog_gems': underdog_gems,
        'is_underdog': is_underdog
    }


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
