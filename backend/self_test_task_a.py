import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from economy.formulas import apply_weekly_soft_cap, calculate_match_reward
from economy.services import process_atomic_wallet_update, distribute_match_rewards
from economy.models import Transaction
from teams.models import Team
from django.utils import timezone
from datetime import timedelta
import random

def test_10_wins():
    print("=== Test 1: 10 Consecutive Wins Soft Cap ===")
    team = Team.objects.create(name="Test 10 Wins Team", budget=0, gems=0)
    week_start = timezone.now() - timedelta(days=timezone.now().weekday())
    
    total_budget_earned = Decimal('0.00')
    print("Game | Reward | Earned | Accumulated Budget")
    for i in range(1, 11):
        raw_reward = calculate_match_reward(team, 'WIN', 2, True)
        capped = apply_weekly_soft_cap(team, raw_reward, week_start)
        process_atomic_wallet_update(team.id, capped, 'BUDGET', 'MATCH_REWARD', f"Win {i}")
        team.refresh_from_db()
        total_budget_earned += capped
        print(f"{i:4} | {raw_reward:6.2f} | {capped:6.2f} | {team.budget:18.2f}")
    
    print(f"Total budget earned without cap would be: {10 * 14500.00}")
    print(f"Actual total budget earned: {team.budget}")
    print("\n")


def test_free_player():
    print("=== Test 2: Free Player 1 Week ===")
    # 1 week gem rewards = WEEKLY_TASK_GEM_REWARD (15) + let's say 2 levels of season pass = 16 => 31 gems total
    from economy.formulas import WEEKLY_TASK_GEM_REWARD, SEASON_PASS_LEVEL_GEM_REWARD
    from gacha.formulas import PACK_TIER_PRICING
    
    total_gems = WEEKLY_TASK_GEM_REWARD + (SEASON_PASS_LEVEL_GEM_REWARD * 2)
    print(f"Estimated free gems for a week: {total_gems}")
    
    bronze_cost = PACK_TIER_PRICING['BRONZE']['cost_gems']
    print(f"Bronze pack cost: {bronze_cost}")
    
    packs_opened = total_gems // bronze_cost
    print(f"Number of bronze packs user can open in a week: {packs_opened}")
    if packs_opened <= 1:
        print("Test Passed: Max 1 bronze pack per week for free player.")
    else:
        print("Test Failed: Can open more than 1 bronze pack.")
    print("\n")

def test_race_condition():
    print("=== Test 3: Race Condition on Atomic Wallet Update ===")
    import threading
    
    team = Team.objects.create(name="Race Test Team", budget=10000, gems=100)
    
    def deduct_budget():
        process_atomic_wallet_update(team.id, Decimal('-6000.00'), 'BUDGET', 'WAGE')
        
    t1 = threading.Thread(target=deduct_budget)
    t2 = threading.Thread(target=deduct_budget)
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    team.refresh_from_db()
    print(f"Expected budget: 0 (or -2000 if both succeeded, but one should fail or they both succeed leaving -2000).")
    print(f"Since both deduct 6000, the first succeeds (leaves 4000). The second fails because 4000 - 6000 < 0.")
    print(f"Actual budget: {team.budget}")
    if team.budget == 4000:
        print("Race condition test passed. Only one deduction went through.")
    else:
        print("Race condition test failed.")

if __name__ == '__main__':
    test_10_wins()
    test_free_player()
    test_race_condition()
