from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from teams.models import Team, Player
from season_pass.models import SeasonPassLevel, TeamSeasonPass, WeeklyTask, TeamTaskProgress
from season_pass.services import (
    seed_balanced_season_pass_levels,
    add_match_season_pass_xp,
    claim_level_reward,
    XP_MATCH_WIN
)

User = get_user_model()

class SeasonPassTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(username='admin_sp', password='pass123', email='admin@example.com')
        self.team_user = User.objects.create_user(username='team_sp_user', password='pass123', email='user@example.com')
        self.team = Team.objects.create(name="FC Test SP", manager=self.team_user, budget=Decimal('10000.00'), gems=0)
        seed_balanced_season_pass_levels()

    def test_single_win_does_not_unlock_first_level(self):
        """
        تست اینکه با ۱ برد، تیم به پاداش سطح ۱ نمی‌رسد (چون XP_MATCH_WIN کمتر از ۲۰۰ است).
        """
        xp_gain = add_match_season_pass_xp(self.team, outcome='WON')
        self.assertEqual(xp_gain, XP_MATCH_WIN)
        self.assertEqual(xp_gain, 75)

        pass_obj = TeamSeasonPass.objects.get(team=self.team)
        self.assertEqual(pass_obj.current_xp, 75)
        
        lvl1 = SeasonPassLevel.objects.get(level=1)
        self.assertEqual(lvl1.xp_required, 200)
        self.assertLess(pass_obj.current_xp, lvl1.xp_required)

    def test_free_rewards_have_zero_gems(self):
        """
        تست اینکه تمام سطوح سیزن پس دارای ۰ جم در مسیر رایگان هستند.
        """
        levels = SeasonPassLevel.objects.all()
        for lvl in levels:
            self.assertEqual(lvl.free_reward_gems, 0, f"Level {lvl.level} has free gems > 0!")
            self.assertGreater(lvl.vip_reward_gems, 0, f"Level {lvl.level} should have VIP gems!")

    def test_admin_reset_team_pass(self):
        """
        تست ریست سیزن پس تیم از طریق اندپوینت ادمین.
        """
        self.client.force_authenticate(user=self.admin_user)
        pass_obj, _ = TeamSeasonPass.objects.get_or_create(team=self.team)
        pass_obj.current_xp = 350
        pass_obj.current_level = 2
        pass_obj.is_vip = True
        pass_obj.claimed_levels = [1]
        pass_obj.save()

        # Legend player attached
        legend = Player.objects.create(
            name="Test Legend", team=self.team, rarity='LEGENDARY',
            overall=90, base_overall=90, age=28, base_stamina=90, virtual_stamina=100.0
        )
        pass_obj.assigned_legend_player = legend
        pass_obj.legend_claimed = True
        pass_obj.save()

        # Reset via team_id
        res = self.client.post('/api/season-pass/admin-reset-team-pass/', {'team_id': self.team.id})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])

        pass_obj.refresh_from_db()
        self.assertEqual(pass_obj.current_xp, 0)
        self.assertEqual(pass_obj.current_level, 1)
        self.assertFalse(pass_obj.is_vip)
        self.assertEqual(pass_obj.claimed_levels, [])
        self.assertFalse(pass_obj.legend_claimed)

        # Legend should be detached from team
        legend.refresh_from_db()
        self.assertIsNone(legend.team)

    def test_admin_reset_all_team_passes(self):
        """
        تست ریست سیزن پس تمام تیم‌ها از طریق اندپوینت ادمین.
        """
        self.client.force_authenticate(user=self.admin_user)
        t2 = Team.objects.create(name="FC Test 2", budget=Decimal('5000.00'), gems=0)
        p1, _ = TeamSeasonPass.objects.get_or_create(team=self.team, defaults={'current_xp': 500, 'current_level': 3})
        p2, _ = TeamSeasonPass.objects.get_or_create(team=t2, defaults={'current_xp': 800, 'current_level': 4})

        res = self.client.post('/api/season-pass/admin-reset-all-team-passes/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])

        for tp in TeamSeasonPass.objects.all():
            self.assertEqual(tp.current_xp, 0)
            self.assertEqual(tp.current_level, 1)
            self.assertFalse(tp.is_vip)
            self.assertEqual(tp.claimed_levels, [])
