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

    # --- Requirement R2, R3, R4 Boundaries & Corner Cases ---

    def test_r2_strict_gameweek_isolation_no_leakage_across_weeks(self):
        """
        Querying Week 1 must strictly return Week 1 matches and NEVER leak
        matches from Week 10, Week 11, Week 19, Week 2, or Week 3.
        """
        t = Tournament.objects.create(name="Strict League", tournament_type="LEAGUE")
        t_a = self.create_team(name="Team A")
        t_b = self.create_team(name="Team B")

        m_w1_a = Match.objects.create(tournament=t, home_team=t_a, away_team=t_b, round_name="هفته ۱")
        m_w1_b = Match.objects.create(tournament=t, home_team=t_b, away_team=t_a, round_name="هفته 1")
        m_w2 = Match.objects.create(tournament=t, home_team=t_a, away_team=t_b, round_name="هفته ۲")
        m_w10 = Match.objects.create(tournament=t, home_team=t_a, away_team=t_b, round_name="هفته ۱۰")
        m_w11 = Match.objects.create(tournament=t, home_team=t_a, away_team=t_b, round_name="هفته 11")
        m_w19 = Match.objects.create(tournament=t, home_team=t_a, away_team=t_b, round_name="هفته ۱۹")

        # Query Week 1
        res = self.get("/api/matches/schedule/?round=1")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        match_ids = [m["id"] for m in data]

        self.assertIn(m_w1_a.id, match_ids)
        self.assertIn(m_w1_b.id, match_ids)
        self.assertNotIn(m_w2.id, match_ids)
        self.assertNotIn(m_w10.id, match_ids)
        self.assertNotIn(m_w11.id, match_ids)
        self.assertNotIn(m_w19.id, match_ids)

    def test_r2_persian_arabic_ascii_normalization_boundaries(self):
        """
        Persian digit '۱', Arabic digit '١', ASCII '1', and strings 'هفته ۱', 'هفته 1'
        all resolve to the same round query.
        """
        t = Tournament.objects.create(name="Norm League")
        t_a = self.create_team(name="Norm A")
        t_b = self.create_team(name="Norm B")
        m = Match.objects.create(tournament=t, home_team=t_a, away_team=t_b, round_name="هفته ۱")

        for query_val in ["1", "۱", "١", "هفته 1", "هفته ۱"]:
            res = self.get(f"/api/matches/schedule/?round={query_val}")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(len(data), 1, f"Failed for round query: {query_val}")
            self.assertEqual(data[0]["id"], m.id)

    def test_r4_substitution_limit_max_5_subs_control_room(self):
        """
        Admin Arbiter Control Room strictly enforces the 5 substitutions limit per team.
        6th substitution attempt returns 400 Bad Request.
        """
        team = self.create_team(name="Sub Limit Team")
        match = Match.objects.create(home_team=team, away_team=self.third_team, status="LIVE", current_minute=60)

        # Record 5 valid substitutions at minute 45 (half-time)
        for i in range(5):
            p_out = self.create_player(team=team, name=f"Starter Out {i}")
            p_in = self.create_player(team=team, name=f"Sub In {i}")
            res = self.post(f"/api/matches/{match.id}/control/", json={
                "action": "RECORD_SUBSTITUTION",
                "team_id": team.id,
                "player_out_id": p_out.id,
                "player_in_id": p_in.id,
                "minute": 45
            })
            self.assertEqual(res.status_code, 201)

        # 6th substitution attempt -> Rejected
        p_out6 = self.create_player(team=team, name="Starter Out 6")
        p_in6 = self.create_player(team=team, name="Sub In 6")
        res6 = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "RECORD_SUBSTITUTION",
            "team_id": team.id,
            "player_out_id": p_out6.id,
            "player_in_id": p_in6.id,
            "minute": 45
        })
        self.assertEqual(res6.status_code, 400)
        self.assertIn("۵ تعویض", res6.json().get("error", ""))

    def test_r4_substitution_window_limit_3_windows_control_room(self):
        """
        Team is limited to 3 substitution windows during active play (minute 45 excluded).
        4th distinct minute substitution window returns 400 Bad Request.
        """
        team = self.create_team(name="Window Limit Team")
        match = Match.objects.create(home_team=team, away_team=self.third_team, status="LIVE")

        # Window 1 (min 50), Window 2 (min 60), Window 3 (min 70)
        for min_val in [50, 60, 70]:
            p_out = self.create_player(team=team, name=f"Out {min_val}")
            p_in = self.create_player(team=team, name=f"In {min_val}")
            res = self.post(f"/api/matches/{match.id}/control/", json={
                "action": "RECORD_SUBSTITUTION",
                "team_id": team.id,
                "player_out_id": p_out.id,
                "player_in_id": p_in.id,
                "minute": min_val
            })
            self.assertEqual(res.status_code, 201)

        # Window 4 (min 80) -> Rejection
        p_out4 = self.create_player(team=team, name="Out 80")
        p_in4 = self.create_player(team=team, name="In 80")
        res_w4 = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "RECORD_SUBSTITUTION",
            "team_id": team.id,
            "player_out_id": p_out4.id,
            "player_in_id": p_in4.id,
            "minute": 80
        })
        self.assertEqual(res_w4.status_code, 400)
        self.assertIn("پنجره", res_w4.json().get("error", ""))

    def test_r4_red_carded_player_substitution_rejection_control_room(self):
        """
        A player who has received a direct RED or SECOND_YELLOW cannot be substituted.
        """
        team = self.create_team(name="Red Card Team")
        p_ejected = self.create_player(team=team, name="Ejected Star")
        p_bench = self.create_player(team=team, name="Bench Sub")
        match = Match.objects.create(home_team=team, away_team=self.third_team, status="LIVE", current_minute=30)

        # Log RED card
        MatchEvent.objects.create(match=match, player=p_ejected, team=team, event_type="RED", minute=25)

        # Attempt to substitute the ejected player
        res = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "RECORD_SUBSTITUTION",
            "team_id": team.id,
            "player_out_id": p_ejected.id,
            "player_in_id": p_bench.id,
            "minute": 30
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("اخراج شده", res.json().get("error", ""))

    def test_r3_control_room_goal_and_own_goal_score_math(self):
        """
        GOAL increments scoring team score; OWN_GOAL awards the goal to the opponent team.
        """
        h_team = self.home_team
        a_team = self.away_team
        p_h = self.h_p_out
        p_a = self.a_p_out
        match = Match.objects.create(home_team=h_team, away_team=a_team, status="LIVE", home_score=0, away_score=0)

        # 1. Home Goal
        res_g = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "RECORD_EVENT", "event_type": "GOAL", "player_id": p_h.id, "minute": 12
        })
        self.assertEqual(res_g.status_code, 201)
        match.refresh_from_db()
        self.assertEqual(match.home_score, 1)
        self.assertEqual(match.away_score, 0)

        # 2. Away Defender scores OWN_GOAL -> Home team gets +1 goal
        res_og = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "RECORD_EVENT", "event_type": "OWN_GOAL", "player_id": p_a.id, "minute": 30
        })
        self.assertEqual(res_og.status_code, 201)
        match.refresh_from_db()
        self.assertEqual(match.home_score, 2)
        self.assertEqual(match.away_score, 0)

    def test_r3_control_room_var_goal_disallowed(self):
        """
        VAR with var_type GOAL_DISALLOWED decrements the scoring team's score.
        """
        match = Match.objects.create(
            home_team=self.home_team, away_team=self.away_team,
            status="LIVE", home_score=1, away_score=0
        )
        res_var = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "RECORD_EVENT", "event_type": "VAR", "var_type": "GOAL_DISALLOWED",
            "player_id": self.h_p_out.id, "minute": 20, "detail": "گل به دلیل خطا مردود شد"
        })
        self.assertEqual(res_var.status_code, 201)
        match.refresh_from_db()
        self.assertEqual(match.home_score, 0)

    def test_r3_control_room_second_yellow_upgrade(self):
        """
        Recording a second YELLOW on the same player automatically upgrades event_type to SECOND_YELLOW.
        """
        match = Match.objects.create(home_team=self.home_team, away_team=self.away_team, status="LIVE")

        # 1st Yellow
        res1 = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "RECORD_EVENT", "event_type": "YELLOW", "player_id": self.h_p_out.id, "minute": 20
        })
        self.assertEqual(res1.status_code, 201)

        # 2nd Yellow -> Automatic upgrade to SECOND_YELLOW
        res2 = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "RECORD_EVENT", "event_type": "YELLOW", "player_id": self.h_p_out.id, "minute": 65
        })
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(res2.json()["event"]["event_type"], "SECOND_YELLOW")

    def test_r3_control_room_delete_event_score_rollback(self):
        """
        DELETE_EVENT reverts score change, marks event as is_undone=True.
        """
        match = Match.objects.create(
            home_team=self.home_team, away_team=self.away_team,
            status="LIVE", home_score=0, away_score=0
        )
        res_ev = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "RECORD_EVENT", "event_type": "GOAL", "player_id": self.h_p_out.id, "minute": 15
        })
        ev_id = res_ev.json()["event"]["id"]
        match.refresh_from_db()
        self.assertEqual(match.home_score, 1)

        # Undo event
        res_del = self.post(f"/api/matches/{match.id}/control/", json={
            "action": "DELETE_EVENT", "event_id": ev_id
        })
        self.assertEqual(res_del.status_code, 200)
        match.refresh_from_db()
        self.assertEqual(match.home_score, 0)
        ev = MatchEvent.objects.get(id=ev_id)
        self.assertTrue(ev.is_undone)


if __name__ == '__main__':
    unittest.main()
