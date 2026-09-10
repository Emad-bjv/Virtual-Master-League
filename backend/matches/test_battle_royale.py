"""
Unit Tests for Battle Royale Engine & Transfer Market Window
"""
import datetime
from django.test import TestCase
from django.utils import timezone
from teams.models import Team
from matches.models import Tournament, Match, Season
from matches.battle_royale_engine import (
    generate_battle_royale_bracket,
    advance_battle_royale_winner,
    serialize_battle_royale_bracket,
)
from transfers.market_window import get_market_status_info


class BattleRoyaleEngineTests(TestCase):
    def setUp(self):
        self.season = Season.objects.create(name="فصل تست", is_active=True)
        # Create 16 dummy teams
        self.teams = []
        for i in range(16):
            t = Team.objects.create(name=f"Team_{i+1}", is_active=True)
            self.teams.append(t)

    def test_generate_16_team_bracket(self):
        tourney = Tournament.objects.create(
            name="نبرد رویال ۱۶ تیمی",
            tournament_type='BATTLE_ROYALE',
            season=self.season,
            is_active=True
        )
        res = generate_battle_royale_bracket(
            tournament=tourney,
            teams=self.teams,
            start_date=datetime.date(2026, 9, 13), # Sunday
            shuffle_draw=False
        )
        self.assertTrue(res['success'])
        # 15 WB + 14 LB + 2 GF = 31 matches
        self.assertEqual(res['matches_created'], 31)
        self.assertEqual(res['wb_rounds_count'], 4)
        self.assertEqual(res['lb_rounds_count'], 6)

        # Check WB Round 1 matches have teams populated
        wb_r1 = Match.objects.filter(tournament=tourney, bracket_side='WINNERS', bracket_round=1)
        self.assertEqual(wb_r1.count(), 8)
        for m in wb_r1:
            self.assertIsNotNone(m.home_team)
            self.assertIsNotNone(m.away_team)
            self.assertIsNotNone(m.next_match)
            self.assertIsNotNone(m.loser_next_match)
            self.assertFalse(m.has_extra_time)

        # Check WB Semi and Final have extra time enabled
        wb_semi = Match.objects.filter(tournament=tourney, bracket_side='WINNERS', bracket_round=3)
        for m in wb_semi:
            self.assertTrue(m.has_extra_time)

        # Check LB Round 1 & 2 do not have extra time, Round 3+ has extra time
        lb_r1 = Match.objects.filter(tournament=tourney, bracket_side='LOSERS', bracket_round=1)
        for m in lb_r1:
            self.assertFalse(m.has_extra_time)

        lb_r3 = Match.objects.filter(tournament=tourney, bracket_side='LOSERS', bracket_round=3)
        for m in lb_r3:
            self.assertTrue(m.has_extra_time)

    def test_generate_8_team_bracket(self):
        tourney = Tournament.objects.create(
            name="نبرد رویال ۸ تیمی",
            tournament_type='BATTLE_ROYALE',
            season=self.season,
            is_active=True
        )
        res = generate_battle_royale_bracket(
            tournament=tourney,
            teams=self.teams[:8],
            start_date=datetime.date(2026, 9, 13),
            shuffle_draw=False
        )
        self.assertTrue(res['success'])
        # 7 WB + 6 LB + 2 GF = 15 matches
        self.assertEqual(res['matches_created'], 15)
        self.assertEqual(res['wb_rounds_count'], 3)
        self.assertEqual(res['lb_rounds_count'], 4)

    def test_wb_advance_and_loser_drop(self):
        tourney = Tournament.objects.create(
            name="تست پیشروی",
            tournament_type='BATTLE_ROYALE',
            season=self.season,
            is_active=True
        )
        generate_battle_royale_bracket(
            tournament=tourney,
            teams=self.teams,
            start_date=datetime.date(2026, 9, 13),
            shuffle_draw=False
        )

        first_wb = Match.objects.filter(tournament=tourney, bracket_side='WINNERS', bracket_round=1).order_by('id').first()
        first_wb.home_score = 2
        first_wb.away_score = 1
        first_wb.status = 'FINISHED'
        first_wb.save()

        res = advance_battle_royale_winner(first_wb)
        self.assertTrue(res['success'])
        self.assertEqual(res['winner'], first_wb.home_team.name)
        self.assertEqual(res['loser'], first_wb.away_team.name)

        # Verify next_match in WB got winner
        next_m = first_wb.next_match
        next_m.refresh_from_db()
        self.assertEqual(next_m.home_team_id, first_wb.home_team_id)

        # Verify loser_next_match in LB got loser
        lb_target = first_wb.loser_next_match
        lb_target.refresh_from_db()
        self.assertEqual(lb_target.home_team_id, first_wb.away_team_id)

    def test_grand_final_wb_winner_champion(self):
        tourney = Tournament.objects.create(
            name="تست فینال ۱",
            tournament_type='BATTLE_ROYALE',
            season=self.season,
            is_active=True
        )
        generate_battle_royale_bracket(tournament=tourney, teams=self.teams[:8], shuffle_draw=False)

        gf_match = Match.objects.get(tournament=tourney, bracket_side='GRAND_FINAL', is_reset_match=False)
        gf_match.home_team = self.teams[0]  # WB Winner
        gf_match.away_team = self.teams[1]  # LB Winner
        gf_match.home_score = 3
        gf_match.away_score = 1
        gf_match.status = 'FINISHED'
        gf_match.save()

        res = advance_battle_royale_winner(gf_match)
        self.assertTrue(res['success'])
        self.assertTrue(res['is_champion'])
        self.assertEqual(res['champion_name'], self.teams[0].name)
        self.assertFalse(res['bracket_reset_triggered'])

    def test_grand_final_lb_winner_triggers_bracket_reset(self):
        tourney = Tournament.objects.create(
            name="تست فینال ریست",
            tournament_type='BATTLE_ROYALE',
            season=self.season,
            is_active=True
        )
        generate_battle_royale_bracket(tournament=tourney, teams=self.teams[:8], shuffle_draw=False)

        gf_match = Match.objects.get(tournament=tourney, bracket_side='GRAND_FINAL', is_reset_match=False)
        gf_match.home_team = self.teams[0]  # WB Winner
        gf_match.away_team = self.teams[1]  # LB Winner
        gf_match.home_score = 1
        gf_match.away_score = 2
        gf_match.status = 'FINISHED'
        gf_match.save()

        res = advance_battle_royale_winner(gf_match)
        self.assertTrue(res['success'])
        self.assertFalse(res['is_champion'])
        self.assertTrue(res['bracket_reset_triggered'])

        # Reset match should be activated
        reset_m = Match.objects.get(tournament=tourney, bracket_side='GRAND_FINAL', is_reset_match=True)
        self.assertEqual(reset_m.status, 'SCHEDULED')
        self.assertEqual(reset_m.home_team_id, self.teams[0].id)
        self.assertEqual(reset_m.away_team_id, self.teams[1].id)

    def test_serialize_bracket(self):
        tourney = Tournament.objects.create(
            name="تست سریالایز",
            tournament_type='BATTLE_ROYALE',
            season=self.season,
            is_active=True
        )
        generate_battle_royale_bracket(tournament=tourney, teams=self.teams[:8], shuffle_draw=False)
        data = serialize_battle_royale_bracket(tourney)
        self.assertEqual(data['tournament']['name'], "تست سریالایز")
        self.assertEqual(len(data['winners_bracket']), 3)
        self.assertEqual(len(data['losers_bracket']), 4)
        self.assertEqual(len(data['grand_final']), 2)
        self.assertEqual(data['stats']['total_matches'], 15)

    def test_market_status_info(self):
        info = get_market_status_info()
        self.assertIn('is_open', info)
        self.assertIn('mode', info)
        self.assertIn('message', info)
        self.assertIn('seconds_remaining', info)
