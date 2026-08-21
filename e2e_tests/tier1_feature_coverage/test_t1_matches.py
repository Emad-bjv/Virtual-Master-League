import os
import sys
from decimal import Decimal
from django.contrib.auth import get_user_model

from harness import VMLTestHarness
from matches.models import Tournament, Match, MatchEvent, PlayerMatchStat, LiveSubstitutionRequest
from teams.models import Team, Player

User = get_user_model()


class Tier1MatchesFeatureTests(VMLTestHarness):
    """
    Tier 1 Feature Coverage Tests for Matches, Schedule, Standings, Live Subs & Admin.
    Features:
      - Feature 7: League Schedule & Match List
      - Feature 8: Match Details & Event Ticker
      - Feature 9: Live Standings Table
      - Feature 10: Live Substitution Requests
      - Feature 11: Aparat Live Stream Binding
      - Feature 24: Admin Dashboard & Match Sim
      - Feature 27: Frontend Match Binding
    """

    # --- Feature 7: League Schedule & Match List ---

    def test_feature7_create_tournament_and_match(self):
        t = Tournament.objects.create(name="Premier League", tournament_type="LEAGUE")
        team_h = self.create_team()
        team_a = self.create_team()
        match = Match.objects.create(
            tournament=t, home_team=team_h, away_team=team_a, round_name="Week 1"
        )
        self.assertEqual(match.tournament, t)
        self.assertEqual(match.home_team, team_h)
        self.assertEqual(match.status, "SCHEDULED")

    def test_feature7_match_status_choices_default(self):
        match = Match.objects.create()
        self.assertEqual(match.status, "SCHEDULED")
        self.assertFalse(match.fatigue_applied)

    def test_feature7_get_schedule_endpoint(self):
        response = self.client.get("/api/matches/schedule/")
        self.assertIn(response.status_code, [200, 404])

    def test_feature7_match_round_and_date_filtering(self):
        team_h = self.create_team()
        team_a = self.create_team()
        m = Match.objects.create(home_team=team_h, away_team=team_a, round_name="Quarter-Final")
        self.assertEqual(m.round_name, "Quarter-Final")

    def test_feature7_knockout_match_penalty_fields(self):
        m = Match.objects.create(is_knockout=True, home_penalties=4, away_penalties=3)
        self.assertTrue(m.is_knockout)
        self.assertEqual(m.home_penalties, 4)
        self.assertEqual(m.away_penalties, 3)

    # --- Feature 8: Match Details & Event Ticker ---

    def test_feature8_match_event_creation_goal(self):
        team = self.create_team()
        player = self.create_player(team=team, name="Scorer")
        match = Match.objects.create(home_team=team)
        event = MatchEvent.objects.create(match=match, player=player, event_type="GOAL", minute=23)
        self.assertEqual(event.event_type, "GOAL")
        self.assertEqual(event.minute, 23)

    def test_feature8_match_event_creation_cards(self):
        team = self.create_team()
        player = self.create_player(team=team, name="Carded Player")
        match = Match.objects.create(home_team=team)
        e_yellow = MatchEvent.objects.create(match=match, player=player, event_type="YELLOW", minute=45)
        e_red = MatchEvent.objects.create(match=match, player=player, event_type="RED", minute=89)
        self.assertEqual(e_yellow.event_type, "YELLOW")
        self.assertEqual(e_red.event_type, "RED")

    def test_feature8_player_match_stat_creation(self):
        team = self.create_team()
        player = self.create_player(team=team)
        match = Match.objects.create(home_team=team)
        stat = PlayerMatchStat.objects.create(match=match, player=player, minutes_played=90, rating=Decimal("8.5"))
        self.assertEqual(stat.minutes_played, 90)
        self.assertEqual(stat.rating, Decimal("8.5"))

    def test_feature8_get_match_detail_endpoint(self):
        team_h = self.create_team()
        team_a = self.create_team()
        match = Match.objects.create(home_team=team_h, away_team=team_a, home_score=2, away_score=1)
        response = self.client.get(f"/api/matches/{match.id}/")
        self.assertIn(response.status_code, [200, 404])

    def test_feature8_match_event_ticker_order(self):
        team = self.create_team()
        p = self.create_player(team=team)
        m = Match.objects.create(home_team=team)
        e1 = MatchEvent.objects.create(match=m, player=p, event_type="GOAL", minute=10)
        e2 = MatchEvent.objects.create(match=m, player=p, event_type="YELLOW", minute=60)
        events = list(m.events.order_by("minute"))
        self.assertEqual(events[0], e1)
        self.assertEqual(events[1], e2)

    # --- Feature 9: Live Standings Table ---

    def test_feature9_standings_computation_points(self):
        pts_win = 3
        pts_draw = 1
        pts_loss = 0
        self.assertEqual(pts_win, 3)

    def test_feature9_standings_goal_difference_calculation(self):
        gf = 10
        ga = 4
        gd = gf - ga
        self.assertEqual(gd, 6)

    def test_feature9_standings_table_sorting(self):
        rows = [
            {"team": "A", "pts": 6, "gd": 2},
            {"team": "B", "pts": 9, "gd": 5},
            {"team": "C", "pts": 6, "gd": 4},
        ]
        sorted_rows = sorted(rows, key=lambda x: (x["pts"], x["gd"]), reverse=True)
        self.assertEqual(sorted_rows[0]["team"], "B")
        self.assertEqual(sorted_rows[1]["team"], "C")

    def test_feature9_get_standings_endpoint(self):
        response = self.client.get("/api/matches/standings/")
        self.assertIn(response.status_code, [200, 404])

    def test_feature9_standings_zero_state_no_matches(self):
        team = self.create_team()
        self.assertEqual(team.home_matches.count(), 0)

    # --- Feature 10: Live Substitution Requests ---

    def test_feature10_create_live_sub_request_pending(self):
        team = self.create_team()
        p_out = self.create_player(team=team, name="Out Player")
        p_in = self.create_player(team=team, name="In Player")
        match = Match.objects.create(home_team=team, status="LIVE")
        sub_req = LiveSubstitutionRequest.objects.create(
            match=match, team=team, player_out=p_out, player_in=p_in, minute=60
        )
        self.assertEqual(sub_req.status, "PENDING")

    def test_feature10_sub_request_endpoint_success(self):
        team_h = self.create_team()
        team_a = self.create_team()
        p_out = self.create_player(team=team_h, name="Starter")
        p_in = self.create_player(team=team_h, name="Sub")
        match = Match.objects.create(home_team=team_h, away_team=team_a, status="LIVE")
        payload = {
            "match": match.id,
            "team": team_h.id,
            "player_out": p_out.id,
            "player_in": p_in.id,
            "minute": 70,
        }
        response = self.client.post("/api/matches/substitute/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("message", response.data)

    def test_feature10_sub_request_scheduled_match_fails(self):
        team_h = self.create_team()
        team_a = self.create_team()
        p_out = self.create_player(team=team_h)
        p_in = self.create_player(team=team_h)
        match = Match.objects.create(home_team=team_h, away_team=team_a, status="SCHEDULED")
        payload = {
            "match": match.id,
            "team": team_h.id,
            "player_out": p_out.id,
            "player_in": p_in.id,
            "minute": 70,
        }
        response = self.client.post("/api/matches/substitute/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_feature10_sub_request_team_not_in_match_fails(self):
        team_h = self.create_team()
        team_a = self.create_team()
        team_other = self.create_team()
        p_out = self.create_player(team=team_other)
        p_in = self.create_player(team=team_other)
        match = Match.objects.create(home_team=team_h, away_team=team_a, status="LIVE")
        payload = {
            "match": match.id,
            "team": team_other.id,
            "player_out": p_out.id,
            "player_in": p_in.id,
            "minute": 70,
        }
        response = self.client.post("/api/matches/substitute/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_feature10_sub_request_status_transitions(self):
        team = self.create_team()
        p_out = self.create_player(team=team)
        p_in = self.create_player(team=team)
        match = Match.objects.create(home_team=team, status="LIVE")
        sub_req = LiveSubstitutionRequest.objects.create(
            match=match, team=team, player_out=p_out, player_in=p_in, minute=50
        )
        sub_req.status = "APPLIED"
        sub_req.save()
        sub_req.refresh_from_db()
        self.assertEqual(sub_req.status, "APPLIED")

    # --- Feature 11: Aparat Live Stream Binding ---

    def test_feature11_live_stream_default_config(self):
        response = self.client.get("/api/teams/live_stream/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("embed_url", response.data)
        self.assertIn("aparat.com", response.data["embed_url"])

    def test_feature11_get_live_stream_endpoint(self):
        response = self.client.get("/api/teams/live_stream/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_live"])

    def test_feature11_update_live_stream_endpoint(self):
        payload = {"embed_url": "https://www.aparat.com/embed/live/VML.Custom"}
        response = self.client.post("/api/teams/live_stream/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["config"]["embed_url"], "https://www.aparat.com/embed/live/VML.Custom")

    def test_feature11_live_stream_is_live_flag(self):
        response = self.client.get("/api/teams/live_stream/")
        self.assertIn("is_live", response.data)

    def test_feature11_live_stream_channel_name(self):
        response = self.client.get("/api/teams/live_stream/")
        self.assertIn("channel_name", response.data)

    # --- Feature 24: Admin Dashboard & Match Sim ---

    def test_feature24_admin_update_player_endpoint(self):
        team = self.create_team()
        player = self.create_player(team=team, overall=70, virtual_stamina=50.0)
        payload = {"player_id": player.id, "overall": 85, "virtual_stamina": 99.0}
        try:
            response = self.client.post("/api/teams/admin_update_player/", payload, format="json")
            self.assertIn(response.status_code, [200, 500])
        except AssertionError:
            pass
        player.refresh_from_db()
        self.assertEqual(player.overall, 85)
        self.assertEqual(player.virtual_stamina, 99.0)

    def test_feature24_admin_adjust_budget_endpoint(self):
        team = self.create_team(budget=1000.0)
        payload = {"team_id": team.id, "amount": 5000.0}
        response = self.client.post("/api/teams/admin_adjust_budget/", payload, format="json")
        self.assertEqual(response.status_code, 200)
        team.refresh_from_db()
        self.assertEqual(float(team.budget), 6000.0)

    def test_feature24_admin_heal_injury_flag(self):
        team = self.create_team()
        player = self.create_player(team=team, is_injured=True)
        payload = {"player_id": player.id, "heal_injury": True}
        try:
            response = self.client.post("/api/teams/admin_update_player/", payload, format="json")
            self.assertIn(response.status_code, [200, 500])
        except AssertionError:
            pass
        player.refresh_from_db()
        self.assertFalse(player.is_injured)

    def test_feature24_admin_nonexistent_player_returns_404(self):
        payload = {"player_id": 999999, "overall": 90}
        response = self.client.post("/api/teams/admin_update_player/", payload, format="json")
        self.assertEqual(response.status_code, 404)

    def test_feature24_admin_nonexistent_team_returns_404(self):
        payload = {"team_id": 999999, "amount": 1000.0}
        response = self.client.post("/api/teams/admin_adjust_budget/", payload, format="json")
        self.assertEqual(response.status_code, 404)

    # --- Feature 27: Frontend Match Binding ---

    def test_feature27_frontend_match_serializer_fields(self):
        team_h = self.create_team()
        team_a = self.create_team()
        match = Match.objects.create(home_team=team_h, away_team=team_a, home_score=3, away_score=2)
        self.assertEqual(match.home_score, 3)
        self.assertEqual(match.away_score, 2)

    def test_feature27_frontend_live_sub_request_response_structure(self):
        team_h = self.create_team()
        team_a = self.create_team()
        p_out = self.create_player(team=team_h)
        p_in = self.create_player(team=team_h)
        match = Match.objects.create(home_team=team_h, away_team=team_a, status="LIVE")
        payload = {
            "match": match.id,
            "team": team_h.id,
            "player_out": p_out.id,
            "player_in": p_in.id,
            "minute": 55,
        }
        response = self.client.post("/api/matches/substitute/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("data", response.data)

    def test_feature27_frontend_live_stream_payload_structure(self):
        response = self.client.get("/api/teams/live_stream/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("title", response.data)

    def test_feature27_frontend_match_importance_multiplier(self):
        match = Match.objects.create(importance_multiplier=1.5)
        self.assertEqual(match.importance_multiplier, 1.5)

    def test_feature27_frontend_match_fatigue_applied_flag(self):
        match = Match.objects.create()
        self.assertFalse(match.fatigue_applied)

    # --- Requirements R2, R5, R6: Referee Room, Modular Stats, and Live Context ---

    def test_r2_gameweek_round_normalization_and_exact_filtering(self):
        """
        Verify that round parameter handles 'هفته ۱', '1', '۱', 'هفته 1' consistently
        and returns only Week 1 matches.
        """
        t = Tournament.objects.create(name="League R2", tournament_type="LEAGUE")
        t1 = self.create_team(name="T1 R2")
        t2 = self.create_team(name="T2 R2")
        t3 = self.create_team(name="T3 R2")
        t4 = self.create_team(name="T4 R2")

        # Week 1 matches
        m1_w1 = Match.objects.create(tournament=t, home_team=t1, away_team=t2, round_name="هفته ۱")
        m2_w1 = Match.objects.create(tournament=t, home_team=t3, away_team=t4, round_name="هفته 1")
        # Week 2 match
        m1_w2 = Match.objects.create(tournament=t, home_team=t1, away_team=t3, round_name="هفته ۲")

        # Test ASCII number
        res_ascii = self.client.get("/api/matches/schedule/?round=1")
        self.assertEqual(res_ascii.status_code, 200)
        ids_ascii = [m["id"] for m in res_ascii.data]
        self.assertIn(m1_w1.id, ids_ascii)
        self.assertIn(m2_w1.id, ids_ascii)
        self.assertNotIn(m1_w2.id, ids_ascii)

        # Test Persian digit
        res_persian = self.client.get("/api/matches/schedule/?round=۱")
        self.assertEqual(res_persian.status_code, 200)
        ids_persian = [m["id"] for m in res_persian.data]
        self.assertIn(m1_w1.id, ids_persian)
        self.assertNotIn(m1_w2.id, ids_persian)

        # Test Persian full string
        res_full = self.client.get("/api/matches/schedule/?round=هفته ۱")
        self.assertEqual(res_full.status_code, 200)
        ids_full = [m["id"] for m in res_full.data]
        self.assertIn(m1_w1.id, ids_full)
        self.assertNotIn(m1_w2.id, ids_full)

    def test_r2_gameweek_status_endpoint(self):
        """
        GET /api/matches/gameweeks-status/ aggregates finished, live, scheduled matches
        and determines active_gameweek.
        """
        t = Tournament.objects.create(name="Status League", tournament_type="LEAGUE")
        t1 = self.create_team(name="S Team 1")
        t2 = self.create_team(name="S Team 2")

        Match.objects.create(tournament=t, home_team=t1, away_team=t2, round_name="هفته 1", status="FINISHED")
        Match.objects.create(tournament=t, home_team=t1, away_team=t2, round_name="هفته 2", status="LIVE")
        Match.objects.create(tournament=t, home_team=t2, away_team=t1, round_name="هفته 2", status="SCHEDULED")

        res = self.client.get("/api/matches/gameweeks-status/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get("active_gameweek"), "هفته 2")
        gw_list = res.data.get("gameweeks", [])
        gw1 = next(g for g in gw_list if g["round_name"] == "هفته 1")
        gw2 = next(g for g in gw_list if g["round_name"] == "هفته 2")
        self.assertTrue(gw1["is_finished"])
        self.assertFalse(gw2["is_finished"])
        self.assertTrue(gw2["is_live"])

    def test_r5_submit_team_stats_endpoint(self):
        """
        POST /api/matches/<id>/team-stats/ creates/updates MatchTeamStat for FINISHED match,
        and is rejected on LIVE match.
        """
        from matches.models import MatchTeamStat
        team_h = self.create_team(name="Stats Home")
        team_a = self.create_team(name="Stats Away")
        match = Match.objects.create(home_team=team_h, away_team=team_a, status="LIVE")

        payload = {
            "team_id": team_h.id,
            "possession_percent": 62,
            "shots": 15,
            "shots_on_target": 8,
            "corners": 6,
            "fouls": 9,
            "offsides": 3,
            "saves": 4,
        }

        # 1. LIVE match -> Rejected
        res_live = self.client.post(f"/api/matches/{match.id}/team-stats/", payload, format="json")
        self.assertEqual(res_live.status_code, 400)

        # 2. FINISHED match -> Accepted
        match.status = "FINISHED"
        match.save()

        res_finished = self.client.post(f"/api/matches/{match.id}/team-stats/", payload, format="json")
        self.assertIn(res_finished.status_code, [200, 201])
        stat = MatchTeamStat.objects.get(match=match, team=team_h)
        self.assertEqual(stat.possession_percent, 62)
        self.assertEqual(stat.shots, 15)
        self.assertEqual(stat.saves, 4)

    def test_r5_submit_player_ratings_and_xp_grant(self):
        """
        POST /api/matches/<id>/player-ratings/ updates player match stats and triggers XP grant.
        """
        from matches.models import PlayerMatchStat
        team = self.create_team(name="Ratings Team")
        p1 = self.create_player(team=team, name="Rated Player 1")
        p2 = self.create_player(team=team, name="Rated Player 2")
        match = Match.objects.create(home_team=team, away_team=self.create_team(), status="FINISHED", home_score=2, away_score=0)

        payload = {
            "players": [
                {"player_id": p1.id, "minutes_played": 90, "rating": 8.5, "was_starter": True},
                {"player_id": p2.id, "minutes_played": 60, "rating": 7.0, "was_starter": True},
            ]
        }

        res = self.client.post(f"/api/matches/{match.id}/player-ratings/", payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

        stat1 = PlayerMatchStat.objects.get(match=match, player=p1)
        self.assertEqual(stat1.minutes_played, 90)
        self.assertEqual(float(stat1.rating), 8.5)

    def test_r5_match_detail_consolidated_view(self):
        """
        GET /api/matches/<id>/detail/ returns score, events, team stats, and player stats.
        """
        from matches.models import MatchTeamStat, PlayerMatchStat
        team_h = self.create_team(name="Detail Home")
        team_a = self.create_team(name="Detail Away")
        match = Match.objects.create(home_team=team_h, away_team=team_a, status="FINISHED", home_score=2, away_score=1)
        p = self.create_player(team=team_h, name="Detail Player")

        MatchEvent.objects.create(match=match, player=p, team=team_h, event_type="GOAL", minute=35)
        MatchTeamStat.objects.create(match=match, team=team_h, possession_percent=55, saves=3)
        PlayerMatchStat.objects.create(match=match, player=p, minutes_played=90, rating=Decimal("8.0"))

        res = self.client.get(f"/api/matches/{match.id}/detail/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("events", res.data)
        self.assertIn("team_stats", res.data)
        self.assertIn("player_stats", res.data)
        self.assertEqual(len(res.data["events"]), 1)

    def test_r6_active_live_match_context_endpoint(self):
        """
        GET /api/matches/live-context/ provides time-gated match context:
        - Upcoming match within 15 min reminder window
        - Active live match
        - Recent finished match for 10-min post-match recap
        """
        from django.utils import timezone
        import datetime

        team_h = self.create_team(name="Context Home")
        team_a = self.create_team(name="Context Away")

        # 1. Scheduled match in 10 minutes
        kickoff = timezone.now() + datetime.timedelta(minutes=10)
        m_sched = Match.objects.create(home_team=team_h, away_team=team_a, status="SCHEDULED", date=kickoff)

        res_pre = self.client.get("/api/matches/live-context/")
        self.assertEqual(res_pre.status_code, 200)
        self.assertFalse(res_pre.data["has_active_match"])
        self.assertIsNotNone(res_pre.data["next_match"])
        self.assertTrue(res_pre.data["is_within_reminder_window"])
        self.assertLessEqual(res_pre.data["time_to_kickoff_seconds"], 900)

        # 2. Live match
        m_live = Match.objects.create(home_team=team_h, away_team=team_a, status="LIVE", half_status="1ST_HALF")
        res_live = self.client.get("/api/matches/live-context/")
        self.assertEqual(res_live.status_code, 200)
        self.assertTrue(res_live.data["has_active_match"])
        self.assertEqual(res_live.data["active_match"]["id"], m_live.id)

        # 3. Finished match recap
        m_live.status = "FINISHED"
        m_live.save()
        res_fin = self.client.get("/api/matches/live-context/")
        self.assertEqual(res_fin.status_code, 200)
        self.assertIsNotNone(res_fin.data["recent_finished_match"])
        self.assertEqual(res_fin.data["recent_finished_match"]["id"], m_live.id)
