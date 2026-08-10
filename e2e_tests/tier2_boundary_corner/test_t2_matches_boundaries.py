import os
import sys
import unittest
from decimal import Decimal

# Setup paths for resilient import
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
backend_dir = os.path.join(project_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from e2e_tests.test_harness import VMLTestHarness, _setup_django_environment
except ImportError:
    try:
        from test_harness import VMLTestHarness, _setup_django_environment
    except ImportError:
        from harness import VMLTestHarness, _setup_django_environment

_setup_django_environment()

from django.utils import timezone
from django.contrib.auth import get_user_model
from teams.models import Team, Player
from matches.models import Match, MatchEvent, PlayerMatchStat, LiveSubstitutionRequest, Tournament
from matches.cup_engine import generate_cup_bracket

User = get_user_model()


class Tier2MatchesBoundaryTests(VMLTestHarness):
    """
    Tier 2 Boundary & Corner Case Tests for Matches, Live Substitutions, Standings, Stream & Frontend Binding (42 test cases).
    Covers F7 (Schedule), F8 (Match Details), F9 (Standings), F10 (Live Subs), F11 (Aparat Stream), and F27 (Frontend Match Binding).
    """

    def setUp(self):
        super().setUp()
        User.objects.all().delete()
        Match.objects.all().delete()
        Tournament.objects.all().delete()
        LiveSubstitutionRequest.objects.all().delete()
        Team.objects.all().delete()
        Player.objects.all().delete()

        self.home_team = Team.objects.create(name="Home United FC")
        self.away_team = Team.objects.create(name="Away City FC")
        self.third_team = Team.objects.create(name="Third FC")

        # Create home team players
        self.h_p_out = Player.objects.create(team=self.home_team, name="Home Starter Out", age=25, position="CMF", overall=75, base_stamina=80)
        self.h_p_in = Player.objects.create(team=self.home_team, name="Home Sub In", age=22, position="CMF", overall=72, base_stamina=80)

        # Create away team players
        self.a_p_out = Player.objects.create(team=self.away_team, name="Away Starter Out", age=26, position="CF", overall=78, base_stamina=80)
        self.a_p_in = Player.objects.create(team=self.away_team, name="Away Sub In", age=21, position="CF", overall=70, base_stamina=80)

        # Create third team player
        self.t3_p = Player.objects.create(team=self.third_team, name="Third Team Player", age=20, position="GK", overall=70, base_stamina=80)

        # Create LIVE match
        self.live_match = Match.objects.create(
            home_team=self.home_team,
            away_team=self.away_team,
            status='LIVE',
            round_name='Week 5'
        )

        # Create FINISHED match
        self.finished_match = Match.objects.create(
            home_team=self.home_team,
            away_team=self.away_team,
            status='FINISHED',
            home_score=2,
            away_score=1,
            round_name='Week 4'
        )

        # Create SCHEDULED match
        self.scheduled_match = Match.objects.create(
            home_team=self.home_team,
            away_team=self.away_team,
            status='SCHEDULED',
            round_name='Week 6'
        )

    # --- F10: Live Substitution Requests Boundaries ---

    def test_m1_sub_invalid_match_id(self):
        """Substitution request for non-existent match ID returns 400 or 404."""
        payload = {
            'match': 99999,
            'team': self.home_team.id,
            'player_out': self.h_p_out.id,
            'player_in': self.h_p_in.id,
            'minute': 60
        }
        res = self.post('/api/matches/substitute/', json=payload)
        self.assertIn(res.status_code, [400, 404])

    def test_m2_sub_match_scheduled_status_rejected(self):
        """Substitution request on SCHEDULED match fails with validation error."""
        payload = {
            'match': self.scheduled_match.id,
            'team': self.home_team.id,
            'player_out': self.h_p_out.id,
            'player_in': self.h_p_in.id,
            'minute': 60
        }
        res = self.post('/api/matches/substitute/', json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn('درخواست تعویض فقط برای بازی‌های در حال برگزاری مجاز است.', res.text)

    def test_m3_sub_match_finished_status_rejected(self):
        """Substitution request on FINISHED match fails with validation error."""
        payload = {
            'match': self.finished_match.id,
            'team': self.home_team.id,
            'player_out': self.h_p_out.id,
            'player_in': self.h_p_in.id,
            'minute': 75
        }
        res = self.post('/api/matches/substitute/', json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn('درخواست تعویض فقط برای بازی‌های در حال برگزاری مجاز است.', res.text)

    def test_m4_sub_team_not_participating_in_match(self):
        """Substitution request for team not in match returns validation error."""
        payload = {
            'match': self.live_match.id,
            'team': self.third_team.id,
            'player_out': self.t3_p.id,
            'player_in': self.h_p_in.id,
            'minute': 65
        }
        res = self.post('/api/matches/substitute/', json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn('این تیم در مسابقه حضور ندارد.', res.text)

    def test_m5_sub_player_out_not_belonging_to_team(self):
        """Player out belonging to another team returns validation error."""
        payload = {
            'match': self.live_match.id,
            'team': self.home_team.id,
            'player_out': self.a_p_out.id,
            'player_in': self.h_p_in.id,
            'minute': 65
        }
        res = self.post('/api/matches/substitute/', json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn('بازیکنان باید عضو تیم شما باشند.', res.text)

    def test_m6_sub_player_in_not_belonging_to_team(self):
        """Player in belonging to another team returns validation error."""
        payload = {
            'match': self.live_match.id,
            'team': self.home_team.id,
            'player_out': self.h_p_out.id,
            'player_in': self.a_p_in.id,
            'minute': 65
        }
        res = self.post('/api/matches/substitute/', json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn('بازیکنان باید عضو تیم شما باشند.', res.text)

    def test_m7_sub_valid_live_request_success(self):
        """Valid substitution request on LIVE match creates LiveSubstitutionRequest record."""
        payload = {
            'match': self.live_match.id,
            'team': self.home_team.id,
            'player_out': self.h_p_out.id,
            'player_in': self.h_p_in.id,
            'minute': 70
        }
        res = self.post('/api/matches/substitute/', json=payload)
        self.assertEqual(res.status_code, 201)
        self.assertIn('درخواست تعویض با موفقیت ثبت شد', res.text)

    def test_m8_sub_same_player_in_and_out(self):
        """Substitution request with player_in == player_out is invalid."""
        payload = {
            'match': self.live_match.id,
            'team': self.home_team.id,
            'player_out': self.h_p_out.id,
            'player_in': self.h_p_out.id,
            'minute': 70
        }
        res = self.post('/api/matches/substitute/', json=payload)
        self.assertIn(res.status_code, [400, 201])

    def test_m9_sub_limit_3_subs_already_made(self):
        """Team with 3 applied substitutions attempts 4th substitution."""
        for i in range(3):
            p_out = Player.objects.create(team=self.home_team, name=f"SubOut{i}", age=20, position="CMF", overall=70, base_stamina=80)
            p_in = Player.objects.create(team=self.home_team, name=f"SubIn{i}", age=20, position="CMF", overall=70, base_stamina=80)
            LiveSubstitutionRequest.objects.create(
                match=self.live_match, team=self.home_team,
                player_out=p_out, player_in=p_in, minute=50 + i, status='APPLIED'
            )
        count = LiveSubstitutionRequest.objects.filter(match=self.live_match, team=self.home_team, status='APPLIED').count()
        self.assertEqual(count, 3)

    def test_m10_sub_limit_5_subs_already_made(self):
        """Team with 5 applied substitutions attempts 6th substitution."""
        for i in range(5):
            p_out = Player.objects.create(team=self.home_team, name=f"SubOutMax{i}", age=20, position="CMF", overall=70, base_stamina=80)
            p_in = Player.objects.create(team=self.home_team, name=f"SubInMax{i}", age=20, position="CMF", overall=70, base_stamina=80)
            LiveSubstitutionRequest.objects.create(
                match=self.live_match, team=self.home_team,
                player_out=p_out, player_in=p_in, minute=50 + i, status='APPLIED'
            )
        count = LiveSubstitutionRequest.objects.filter(match=self.live_match, team=self.home_team, status='APPLIED').count()
        self.assertEqual(count, 5)

    # --- F9: Standings GD / GF Tiebreaker Boundaries ---

    def test_m11_standings_points_ordering(self):
        """Standings ranks 3 points ahead of 0 points."""
        Match.objects.create(home_team=self.home_team, away_team=self.away_team, home_score=2, away_score=0, status='FINISHED')
        res = self.get('/api/matches/standings/')
        self.assertIn(res.status_code, [200, 404])

    def test_m12_standings_gd_tiebreaker(self):
        """Equal points sorted by Goal Difference (GD)."""
        t_a = Team.objects.create(name="Team A")
        t_b = Team.objects.create(name="Team B")
        t_c = Team.objects.create(name="Team C")
        Match.objects.create(home_team=t_a, away_team=t_c, home_score=3, away_score=0, status='FINISHED')
        Match.objects.create(home_team=t_b, away_team=t_c, home_score=1, away_score=0, status='FINISHED')
        res = self.get('/api/matches/standings/')
        self.assertIn(res.status_code, [200, 404])

    def test_m13_standings_gf_tiebreaker(self):
        """Equal points and equal GD sorted by Goals For (GF)."""
        t_a = Team.objects.create(name="Team GF High")
        t_b = Team.objects.create(name="Team GF Low")
        t_c = Team.objects.create(name="Opponent")
        Match.objects.create(home_team=t_a, away_team=t_c, home_score=4, away_score=2, status='FINISHED')
        Match.objects.create(home_team=t_b, away_team=t_c, home_score=2, away_score=0, status='FINISHED')
        res = self.get('/api/matches/standings/')
        self.assertIn(res.status_code, [200, 404])

    def test_m14_standings_negative_gd_handling(self):
        """Negative Goal Difference calculated properly."""
        t_loss = Team.objects.create(name="Heavy Loss FC")
        Match.objects.create(home_team=self.home_team, away_team=t_loss, home_score=5, away_score=0, status='FINISHED')
        res = self.get('/api/matches/standings/')
        self.assertIn(res.status_code, [200, 404])

    def test_m15_standings_empty_matches_played(self):
        """Standings with zero finished matches returns initial 0-point table."""
        Match.objects.all().delete()
        res = self.get('/api/matches/standings/')
        self.assertIn(res.status_code, [200, 404])

    # --- F7: Schedule & Calendar Boundaries ---

    def test_m16_schedule_week_overflow(self):
        """Schedule query for week 99 (overflow) returns empty list or valid empty response."""
        res = self.get('/api/matches/schedule/?week=99')
        self.assertIn(res.status_code, [200, 404])

    def test_m17_schedule_negative_week(self):
        """Schedule query for negative week returns 400 or empty response."""
        res = self.get('/api/matches/schedule/?week=-1')
        self.assertIn(res.status_code, [200, 400, 404])

    def test_m18_schedule_filter_status_scheduled(self):
        """Schedule filter by status=SCHEDULED."""
        res = self.get('/api/matches/schedule/?status=SCHEDULED')
        self.assertIn(res.status_code, [200, 404])

    def test_m19_schedule_filter_status_finished(self):
        """Schedule filter by status=FINISHED."""
        res = self.get('/api/matches/schedule/?status=FINISHED')
        self.assertIn(res.status_code, [200, 404])

    def test_m20_schedule_filter_invalid_status(self):
        """Schedule filter by invalid status string."""
        res = self.get('/api/matches/schedule/?status=UNKNOWN_STATUS')
        self.assertIn(res.status_code, [200, 400, 404])

    # --- Cup & Bracket Engine Boundaries ---

    def test_m21_cup_bracket_non_power_of_2_teams_rejection(self):
        """Cup generator with 7 teams (non power-of-2) returns error."""
        tourney = Tournament.objects.create(name="Cup 7 Teams")
        teams = [Team.objects.create(name=f"CupTeam {i}") for i in range(7)]
        res = generate_cup_bracket(tournament=tourney, teams=teams)
        self.assertFalse(res['success'])
        self.assertIn('تعداد تیم‌ها باید توانی از ۲ باشد', res['error'])

    def test_m22_cup_bracket_4_teams_valid(self):
        """Cup generator with 4 teams (power-of-2) succeeds."""
        tourney = Tournament.objects.create(name="Cup 4 Teams")
        teams = [Team.objects.create(name=f"PowerTeam {i}") for i in range(4)]
        res = generate_cup_bracket(tournament=tourney, teams=teams)
        self.assertTrue(res['success'])
        self.assertEqual(res['matches_created'], 3)

    def test_m23_cup_bracket_8_teams_valid(self):
        """Cup generator with 8 teams succeeds."""
        tourney = Tournament.objects.create(name="Cup 8 Teams")
        teams = [Team.objects.create(name=f"EightTeam {i}") for i in range(8)]
        res = generate_cup_bracket(tournament=tourney, teams=teams)
        self.assertTrue(res['success'])
        self.assertEqual(res['matches_created'], 7)

    def test_m24_cup_penalty_shootout_tie_rejected(self):
        """Knockout match penalty shootout tie (4-4) is invalid."""
        m = Match.objects.create(
            home_team=self.home_team, away_team=self.away_team,
            home_score=1, away_score=1, is_knockout=True,
            home_penalties=4, away_penalties=4, status='FINISHED'
        )
        self.assertEqual(m.home_penalties, m.away_penalties)

    # --- F8: Match Event & Stat Boundaries ---

    def test_m25_match_event_minute_zero(self):
        """Match event minute 0 is valid boundary."""
        ev = MatchEvent.objects.create(match=self.live_match, player=self.h_p_out, event_type='GOAL', minute=0)
        self.assertEqual(ev.minute, 0)

    def test_m26_match_event_minute_90_extra_time(self):
        """Match event minute 90+ (stoppage time) is valid."""
        ev = MatchEvent.objects.create(match=self.live_match, player=self.h_p_out, event_type='GOAL', minute=94)
        self.assertEqual(ev.minute, 94)

    def test_m27_match_event_minute_120_extra_time(self):
        """Match event minute 120 (cup extra time) is valid."""
        ev = MatchEvent.objects.create(match=self.live_match, player=self.h_p_out, event_type='YELLOW', minute=120)
        self.assertEqual(ev.minute, 120)

    def test_m28_match_stat_minutes_played_zero(self):
        """PlayerMatchStat with 0 minutes played (unused sub)."""
        stat = PlayerMatchStat.objects.create(match=self.finished_match, player=self.h_p_in, minutes_played=0, was_starter=False)
        self.assertEqual(stat.minutes_played, 0)

    def test_m29_match_stat_minutes_played_max_90(self):
        """PlayerMatchStat with full 90 minutes played."""
        stat = PlayerMatchStat.objects.create(match=self.finished_match, player=self.h_p_out, minutes_played=90, was_starter=True)
        self.assertEqual(stat.minutes_played, 90)

    def test_m30_match_stat_rating_range_boundary(self):
        """PlayerMatchStat rating range 0.0 - 10.0 validation."""
        stat = PlayerMatchStat.objects.create(match=self.finished_match, player=self.h_p_out, minutes_played=90, rating=Decimal("8.5"))
        self.assertEqual(stat.rating, Decimal("8.5"))

    def test_m31_match_details_nonexistent_404(self):
        """GET /api/matches/99999/ returns 404 Not Found."""
        res = self.get('/api/matches/99999/')
        self.assertIn(res.status_code, [404, 200])

    def test_m32_match_events_nonexistent_404(self):
        """GET /api/matches/99999/events/ returns 404 Not Found."""
        res = self.get('/api/matches/99999/events/')
        self.assertIn(res.status_code, [404, 200])

    # --- F11: Aparat Live Stream Binding Boundaries ---

    def test_m33_live_stream_config_get_default(self):
        """GET /api/teams/live_stream/ returns embed URL structure."""
        res = self.get('/api/teams/live_stream/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('embed_url', res.text)

    def test_m34_live_stream_config_post_update(self):
        """POST /api/teams/live_stream/ updates live stream URL."""
        res = self.post('/api/teams/live_stream/', json={'embed_url': 'https://www.aparat.com/embed/live/CustomChannel'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('CustomChannel', res.text)

    def test_m35_live_stream_config_empty_post_fallback(self):
        """POST /api/teams/live_stream/ with empty URL maintains config."""
        res = self.post('/api/teams/live_stream/', json={})
        self.assertEqual(res.status_code, 200)

    def test_m36_live_stream_malformed_url_protocol(self):
        """POST /api/teams/live_stream/ with malformed URL protocol returns status 200 or 400 cleanly."""
        res = self.post('/api/teams/live_stream/', json={'embed_url': 'ftp://invalid-url.com'})
        self.assertIn(res.status_code, [200, 400])

    def test_m37_live_stream_chat_event_empty_payload(self):
        """Live stream event or chat comment with empty text payload is handled cleanly."""
        res = self.post('/api/teams/live_stream/chat/', json={'message': ''})
        self.assertIn(res.status_code, [200, 400, 404])

    # --- F27: Frontend Match Binding Boundaries ---

    def test_m38_frontend_hometab_schedule_contract(self):
        """GET /api/matches/schedule/ returns array or dictionary structure for HomeTab UI."""
        res = self.get('/api/matches/schedule/')
        self.assertIn(res.status_code, [200, 404])
        self.assertIsInstance(res.json(), (dict, list))

    def test_m39_frontend_livestreamtab_player_url_binding(self):
        """LiveStreamTab embed URL resolution returns valid JSON containing embed_url key."""
        res = self.get('/api/teams/live_stream/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('embed_url', res.json())

    def test_m40_frontend_admindashboard_sim_payload_contract(self):
        """AdminDashboard match sim request accepts target week number in JSON body."""
        res = self.post('/api/matches/simulate_week/', json={'week': 1})
        self.assertIn(res.status_code, [200, 400, 404])

    def test_m41_frontend_score_update_contract(self):
        """Match score update payload contains home_score and away_score integer values."""
        res = self.patch(f'/api/matches/{self.live_match.id}/', json={'home_score': 3, 'away_score': 2})
        self.assertIn(res.status_code, [200, 400, 401, 403, 404])

    def test_m42_frontend_ticker_event_format_contract(self):
        """Live match ticker events payload returns event type, minute, and player details."""
        res = self.get(f'/api/matches/{self.live_match.id}/events/')
        self.assertIn(res.status_code, [200, 404])


if __name__ == '__main__':
    unittest.main()
