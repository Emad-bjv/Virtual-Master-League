import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from season_pass.models import SeasonPassLevel, WeeklyTask, TeamTaskProgress, TeamSeasonPass
from teams.models import Team
from season_pass.services import increment_task_progress, claim_task_reward

def setup_data():
    SeasonPassLevel.objects.all().delete()
    WeeklyTask.objects.all().delete()
    TeamTaskProgress.objects.all().delete()
    TeamSeasonPass.objects.all().delete()
    
    # Create 10 levels, total 2000 XP needed for max level
    # 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000
    for i in range(1, 11):
        SeasonPassLevel.objects.create(
            level=i,
            xp_required=i * 200,
            free_reward_gems=10 * i,
            vip_reward_gems=20 * i,
            vip_reward_player_rarity='LEGENDARY' if i == 10 else '',
            is_final_level=(i == 10)
        )
        
    # Create 4 weeks of tasks
    # Each week:
    # 3x WIN_MATCHES (50 XP) -> 150
    # 5x SCORE_GOALS (10 XP) -> 50
    # 1x SUBMIT_LINEUP (100 XP) -> 100
    # Total per week = 300 XP
    # 4 weeks = 1200 XP?
    # Wait, if max level is 2000, we need more XP or lower requirements.
    # Let's adjust tasks:
    # WIN_MATCHES: 3 wins (150 XP)
    # SCORE_GOALS: 10 goals (150 XP)
    # SUBMIT_LINEUP: 1 time (100 XP)
    # CLEAN_SHEETS: 2 times (100 XP)
    # Total per week = 500 XP. Over 4 weeks = 2000 XP.
    
    for w in range(1, 5):
        WeeklyTask.objects.create(title=f"بردن ۳ بازی - هفته {w}", task_type='WIN_MATCHES', target_value=3, reward_xp=150, week_number=w)
        WeeklyTask.objects.create(title=f"زدن ۱۰ گل - هفته {w}", task_type='SCORE_GOALS', target_value=10, reward_xp=150, week_number=w)
        WeeklyTask.objects.create(title=f"ثبت ترکیب - هفته {w}", task_type='SUBMIT_LINEUP', target_value=1, reward_xp=100, week_number=w)
        WeeklyTask.objects.create(title=f"۲ کلین‌شیت - هفته {w}", task_type='CLEAN_SHEETS', target_value=2, reward_xp=100, week_number=w)

def simulate_team():
    team = Team.objects.first()
    if not team:
        print("No team found for simulation.")
        return
        
    print(f"--- Simulating for {team.name} ---")
    
    for w in range(1, 5):
        print(f"\nWeek {w} Start:")
        tasks = WeeklyTask.objects.filter(week_number=w)
        for t in tasks:
            TeamTaskProgress.objects.create(team=team, task=t)
            
        # Simulate actions
        # 3 wins
        increment_task_progress(team, 'WIN_MATCHES', 3)
        # 10 goals
        increment_task_progress(team, 'SCORE_GOALS', 10)
        # submit lineup
        increment_task_progress(team, 'SUBMIT_LINEUP', 1)
        # 2 clean sheets
        increment_task_progress(team, 'CLEAN_SHEETS', 2)
        
        # Check progress completion without claim
        pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=team)
        print(f"XP before claiming: {pass_obj.current_xp}")
        assert pass_obj.current_xp == (w - 1) * 500, "XP should not increase automatically"
        
        # Claim
        for progress in TeamTaskProgress.objects.filter(team=team, task__week_number=w):
            res = claim_task_reward(team, progress.id)
            if not res['success']:
                print(f"Failed to claim {progress.task.title}: {res.get('error')}")
                
        pass_obj.refresh_from_db()
        print(f"XP after claiming: {pass_obj.current_xp}, Level: {pass_obj.current_level}")
        
    print("\n--- Testing Level Rewards ---")
    from season_pass.services import claim_level_reward
    
    # Try claiming level 10 WITHOUT VIP
    res1 = claim_level_reward(team, 10)
    print("Claim Level 10 (No VIP):", res1)
    assert res1['success'] == True
    assert 'legendary_player' not in res1, "Should not get legendary without VIP!"
    
    # Enable VIP
    pass_obj.is_vip = True
    pass_obj.claimed_levels = [] # Reset claims for testing
    pass_obj.save()
    
    # Try claiming level 10 WITH VIP
    res2 = claim_level_reward(team, 10)
    print("Claim Level 10 (With VIP):", res2)
    assert res2['success'] == True
    assert 'legendary_player' in res2, "Should get legendary with VIP!"

    print("\nSimulation completed successfully!")
    print(f"Final XP: {pass_obj.current_xp}, Final Level: {pass_obj.current_level}")

if __name__ == '__main__':
    setup_data()
    simulate_team()
