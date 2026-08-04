from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from teams.models import Team, Player, PlayerAbilities, ClubFacilities, PlayerGrowthLog
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
        PlayerAbilities.objects.create(player=self.young_player)
        
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
        PlayerAbilities.objects.create(player=self.veteran_player)

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
        PlayerAbilities.objects.create(player=self.star_striker, finishing=80, offensive_awareness=80)
        
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
