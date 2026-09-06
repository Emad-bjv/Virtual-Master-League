from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from teams.models import Team, Player, ClubFacilities, PlayerGrowthLog
from teams.stamina_engine import (
    calculate_fatigue, apply_fatigue, apply_recovery, update_lock_status
)
from teams.growth_engine import evaluate_player, apply_rust_decay, performance_index
from matches.models import Match, MatchEvent, PlayerMatchStat

class StaminaEngineTestCase(TestCase):
    def setUp(self):
        self.team = Team.objects.create(name="Test Team", budget=1000)
        self.facilities = ClubFacilities.objects.create(team=self.team, gym_level=1, medical_level=1)
        
        self.young_player = Player.objects.create(
            team=self.team,
            name="Young Star",
            age=20,
            position="CF",
            overall=80,
            base_stamina=90,
            virtual_stamina=100.00,
            consecutive_games=0
        )
        
        self.veteran_player = Player.objects.create(
            team=self.team,
            name="Old Veteran",
            age=34,
            position="CB",
            overall=78,
            base_stamina=50,
            virtual_stamina=100.00,
            consecutive_games=3
        )

    def test_fatigue_difference(self):
        young_fatigue = calculate_fatigue(self.young_player, self.team, 90)
        vet_fatigue = calculate_fatigue(self.veteran_player, self.team, 90)
        self.assertEqual(young_fatigue, Decimal('0.00'))
        self.assertEqual(vet_fatigue, Decimal('0.00'))

    def test_apply_fatigue(self):
        apply_fatigue(self.young_player, 90)
        self.young_player.refresh_from_db()
        self.assertEqual(self.young_player.consecutive_games, 0)
        self.assertEqual(self.young_player.virtual_stamina, Decimal('100.00'))
        self.assertFalse(self.young_player.is_locked)

    def test_stamina_lock_threshold(self):
        update_lock_status(self.young_player)
        self.assertFalse(self.young_player.is_locked)

    def test_recovery(self):
        apply_recovery(self.young_player)
        self.young_player.refresh_from_db()
        self.assertEqual(self.young_player.virtual_stamina, Decimal('100.00'))
        self.assertEqual(self.young_player.consecutive_games, 0)


class GrowthEngineTestCase(TestCase):
    def setUp(self):
        self.team_a = Team.objects.create(name="Team A", budget=1000)
        ClubFacilities.objects.create(team=self.team_a)

        self.star_striker = Player.objects.create(
            team=self.team_a, name="Super Striker", age=24, position="CF",
            overall=80, potential_ovr=90, base_stamina=85, virtual_stamina=100
        )
        
        self.matches = []
        for i in range(3):
            m = Match.objects.create(
                home_team=self.team_a, away_team=None,
                home_score=2, away_score=0,
                date=timezone.now(), status='FINISHED'
            )
            self.matches.append(m)

    def test_performance_index(self):
        self.assertEqual(performance_index(6.0), 50.0)
        self.assertEqual(performance_index(8.0), 100.0)
        self.assertEqual(performance_index(4.0), 0.0)

    def test_upgrade_for_high_performance(self):
        match_ids = [m.id for m in self.matches]
        for m in self.matches:
            PlayerMatchStat.objects.create(
                match=m, player=self.star_striker, minutes_played=90, rating=8.0
            )

        res = evaluate_player(self.star_striker, match_ids, "Week 6")
        self.star_striker.refresh_from_db()
        self.assertEqual(res['status'], 'PROCESSED')
        self.assertTrue(PlayerGrowthLog.objects.filter(player=self.star_striker).exists())

    def test_insufficient_games_skipped(self):
        for m in self.matches[:2]:
            PlayerMatchStat.objects.create(
                match=m, player=self.star_striker, minutes_played=90, rating=8.0
            )
        match_ids = [m.id for m in self.matches]
        res = evaluate_player(self.star_striker, match_ids, "Week 6")
        self.assertEqual(res['status'], 'SKIPPED')


from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()

class PlayerAndFacilityActionsTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="coach_user", password="password123")
        self.team = Team.objects.create(name="FC Test", manager=self.user, budget=1000, gems=50)
        self.facility = ClubFacilities.objects.create(team=self.team, gym_level=0)
        self.player = Player.objects.create(
            team=self.team, name="Injured Tired Player", age=25, position="CMF",
            overall=82, base_stamina=80, virtual_stamina=20.0, is_locked=True,
            is_injured=True, injury_return_date=timezone.now().date()
        )
        self.client.force_authenticate(user=self.user)

    def test_recover_stamina_success(self):
        url = f"/api/players/{self.player.id}/recover_stamina/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('غیرفعال', response.data['status'])
        self.player.refresh_from_db()
        self.assertEqual(float(self.player.virtual_stamina), 100.0)
        self.assertFalse(self.player.is_locked)

    def test_heal_injury_success(self):
        url = f"/api/players/{self.player.id}/heal_injury/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.player.refresh_from_db()
        self.team.refresh_from_db()
        self.assertFalse(self.player.is_injured)
        self.assertEqual(self.player.injury_matches, 0)
        self.assertIsNone(self.player.injury_return_date)
        self.assertEqual(self.team.gems, 25) # 50 - 25

    def test_facility_upgrade_with_gems(self):
        url = f"/api/teams/{self.team.id}/upgrade_facility/"
        response = self.client.post(url, {'facility': 'gym_level'})
        self.assertEqual(response.status_code, 200)
        self.facility.refresh_from_db()
        self.team.refresh_from_db()
        self.assertEqual(self.facility.gym_level, 1)
        self.assertEqual(self.team.gems, 35) # lvl 0 cost = 15 -> 50 - 15 = 35

    def test_gem_boost_progression_to_max_99(self):
        self.team.gems = 30000
        self.team.save()
        self.player.level = 1
        self.player.overall = 87
        self.player.base_overall = 87
        self.player.potential_ovr = 89
        self.player.save()

        # Upgrade from level 1 to 2 with gems (costs 10 gems in Scenario 1)
        url = f"/api/players/{self.player.id}/gem_boost/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.player.refresh_from_db()
        self.team.refresh_from_db()
        self.assertEqual(self.player.level, 2)
        self.assertEqual(self.team.gems, 29990) # 30000 - 10

        # Max out to level 20
        self.player.level = 19
        self.player.save()
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.player.refresh_from_db()
        self.assertEqual(self.player.level, 20)
        self.assertEqual(self.player.overall, 99) # Max PES 99!

    def test_free_xp_capped_at_potential(self):
        from teams.level_engine import apply_level_bonus
        self.player.overall = 89
        self.player.potential_ovr = 89
        self.player.save()

        apply_level_bonus(self.player, 5)
        self.player.refresh_from_db()
        self.assertEqual(self.player.overall, 89) # Capped at potential_ovr!


class PESSkillsUpgradeTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="test_madrid_coach", password="password123", role="admin")
        self.team = Team.objects.create(name="Real Madrid", manager=self.user, budget=1000, gems=500)
        self.player = Player.objects.create(
            team=self.team,
            name="Vinicius Jr",
            age=24,
            position="LWF",
            overall=88,
            base_overall=88,
            base_stamina=90
        )
        self.client.force_authenticate(user=self.user)

    def test_get_skills_breakdown(self):
        url = f"/api/players/{self.player.id}/skills/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        skills = res.data['skills']
        # LWF has 6 skills: ball_control, dribbling, speed, acceleration, curl, lofted_pass
        self.assertEqual(len(skills), 6)
        keys = [s['key'] for s in skills]
        self.assertIn('dribbling', keys)
        self.assertIn('speed', keys)
        self.assertIn('curl', keys)

    def test_upgrade_skill_success(self):
        url = f"/api/players/{self.player.id}/upgrade_skill/"
        # First upgrade: level 0 -> 1 (costs 5 gems)
        res = self.client.post(url, {'skill_key': 'dribbling'}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.team.refresh_from_db()
        self.player.refresh_from_db()

        self.assertEqual(self.team.gems, 495) # 500 - 5
        skill_data = self.player.skills_data.get('dribbling')
        self.assertEqual(skill_data['level'], 1)
        self.assertFalse(skill_data['pes_applied'])

        # Second upgrade: level 1 -> 2 (costs 10 gems) -> PES stat should increase by +1
        res = self.client.post(url, {'skill_key': 'dribbling'}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.player.refresh_from_db()
        skill_data = self.player.skills_data.get('dribbling')
        self.assertEqual(skill_data['level'], 2)
        self.assertEqual(skill_data['pes_bonus'], 1) # 2 // 2 = +1

    def test_admin_pes_skills_overview_and_actions(self):
        # Upgrade a skill first so there's a pending change
        from teams.level_engine import upgrade_player_pes_skill, admin_mark_pes_skill_applied, admin_update_player_ovr
        upgrade_player_pes_skill(self.player, 'speed')

        # Admin overview
        overview_url = "/api/players/pes_skills_overview/"
        res = self.client.get(overview_url)
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(res.data['total_pending'], 1)

        # Mark applied
        mark_url = "/api/players/mark_pes_skill_applied/"
        res = self.client.post(mark_url, {'player_id': self.player.id, 'all_skills': True}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.player.refresh_from_db()
        self.assertTrue(self.player.skills_data['speed']['pes_applied'])

        # Update OVR
        ovr_url = "/api/players/update_player_ovr/"
        res = self.client.post(ovr_url, {'player_id': self.player.id, 'overall': 90}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.player.refresh_from_db()
        self.assertEqual(self.player.overall, 90)


