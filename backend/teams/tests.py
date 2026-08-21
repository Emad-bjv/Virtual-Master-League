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
        self.assertGreater(vet_fatigue, young_fatigue)

    def test_apply_fatigue(self):
        apply_fatigue(self.young_player, 90)
        self.young_player.refresh_from_db()
        self.assertEqual(self.young_player.consecutive_games, 1)
        self.assertLess(self.young_player.virtual_stamina, Decimal('100.00'))
        self.assertFalse(self.young_player.is_locked)

    def test_stamina_lock_threshold(self):
        self.young_player.virtual_stamina = Decimal('29.00')
        self.young_player.save()
        update_lock_status(self.young_player)
        self.assertTrue(self.young_player.is_locked)

    def test_recovery(self):
        self.young_player.virtual_stamina = Decimal('50.00')
        self.young_player.consecutive_games = 2
        self.young_player.save()
        apply_recovery(self.young_player)
        self.young_player.refresh_from_db()
        self.assertGreater(self.young_player.virtual_stamina, Decimal('50.00'))
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
        self.player.refresh_from_db()
        self.team.refresh_from_db()
        self.assertEqual(float(self.player.virtual_stamina), 70.0)
        self.assertFalse(self.player.is_locked)
        self.assertEqual(self.team.gems, 40) # 50 - 10

    def test_recover_stamina_insufficient_gems(self):
        self.team.gems = 5
        self.team.save()
        url = f"/api/players/{self.player.id}/recover_stamina/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 400)
        self.assertIn('جم کافی نیست', response.data['error'])

    def test_heal_injury_success(self):
        url = f"/api/players/{self.player.id}/heal_injury/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.player.refresh_from_db()
        self.team.refresh_from_db()
        self.assertFalse(self.player.is_injured)
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

