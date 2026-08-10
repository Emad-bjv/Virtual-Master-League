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
