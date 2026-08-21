from django.test import TestCase
from teams.models import Team
from matches.models import Tournament, Match
from matches.cup_engine import generate_cup_bracket, advance_winner, get_round_name


class CupEngineTestCase(TestCase):
    def setUp(self):
        self.tournament = Tournament.objects.create(name="Season 1 Cup", tournament_type='CUP')
        self.teams = []
        for i in range(8):
            t = Team.objects.create(name=f"Team {i+1}", budget=1000)
            self.teams.append(t)

    def test_get_round_name(self):
        self.assertEqual(get_round_name(2), "Final")
        self.assertEqual(get_round_name(4), "Semi-Finals")
        self.assertEqual(get_round_name(8), "Quarter-Finals")
        self.assertEqual(get_round_name(16), "Round of 16")
        self.assertEqual(get_round_name(32), "Round of 32")

    def test_generate_cup_bracket_8_teams(self):
        result = generate_cup_bracket(self.tournament, self.teams)
        self.assertTrue(result['success'])
        
        # 8 teams = 4 QF + 2 SF + 1 Final = 7 matches
        self.assertEqual(result['matches_created'], 7)
        self.assertEqual(result['first_round_matches'], 4)
        
        matches = Match.objects.filter(tournament=self.tournament)
        self.assertEqual(matches.count(), 7)
        
        # First round should have teams assigned
        qf_matches = matches.filter(round_name="Quarter-Finals")
        self.assertEqual(qf_matches.count(), 4)
        for m in qf_matches:
            self.assertIsNotNone(m.home_team)
            self.assertIsNotNone(m.away_team)
            self.assertIsNotNone(m.next_match)
            self.assertEqual(m.next_match.round_name, "Semi-Finals")
            
        # Semi-Finals should be empty initially
        sf_matches = matches.filter(round_name="Semi-Finals")
        self.assertEqual(sf_matches.count(), 2)
        for m in sf_matches:
            self.assertIsNone(m.home_team)
            self.assertIsNone(m.away_team)
            self.assertIsNotNone(m.next_match)
            self.assertEqual(m.next_match.round_name, "Final")
            
        # Final should be empty and have no next match
        final_match = matches.get(round_name="Final")
        self.assertIsNone(final_match.home_team)
        self.assertIsNone(final_match.away_team)
        self.assertIsNone(final_match.next_match)

    def test_advance_winner_normal_score(self):
        generate_cup_bracket(self.tournament, self.teams)
        qf_match = Match.objects.filter(tournament=self.tournament, round_name="Quarter-Finals").first()
        
        # Simulate result
        qf_match.home_score = 2
        qf_match.away_score = 1
        qf_match.status = 'FINISHED'
        qf_match.save()
        
        result = advance_winner(qf_match)
        self.assertTrue(result['success'])
        
        # Home team should advance
        next_match = qf_match.next_match
        next_match.refresh_from_db()
        self.assertEqual(next_match.home_team, qf_match.home_team)

    def test_advance_winner_penalties(self):
        generate_cup_bracket(self.tournament, self.teams)
        qf_match = Match.objects.filter(tournament=self.tournament, round_name="Quarter-Finals").first()
        
        # Simulate tie and penalties
        qf_match.home_score = 1
        qf_match.away_score = 1
        qf_match.home_penalties = 3
        qf_match.away_penalties = 4
        qf_match.status = 'FINISHED'
        qf_match.save()
        
        result = advance_winner(qf_match)
        self.assertTrue(result['success'])
        
        # Away team should advance
        next_match = qf_match.next_match
        next_match.refresh_from_db()
        self.assertEqual(next_match.home_team, qf_match.away_team)

    def test_advance_winner_both_slots_fill(self):
        generate_cup_bracket(self.tournament, self.teams)
        
        # Get the final match and its two semi-final feeders
        final_match = Match.objects.get(tournament=self.tournament, round_name="Final")
        sf_matches = Match.objects.filter(next_match=final_match)
        sf1, sf2 = sf_matches[0], sf_matches[1]
        
        # Give them dummy teams since they are initially empty
        sf1.home_team = self.teams[0]
        sf1.away_team = self.teams[1]
        sf1.home_score = 3
        sf1.away_score = 0
        sf1.status = 'FINISHED'
        sf1.save()
        
        sf2.home_team = self.teams[2]
        sf2.away_team = self.teams[3]
        sf2.home_score = 0
        sf2.away_score = 1
        sf2.status = 'FINISHED'
        sf2.save()
        
        # Advance both winners
        res1 = advance_winner(sf1)
        res2 = advance_winner(sf2)
        
        self.assertTrue(res1['success'])
        self.assertTrue(res2['success'])
        
        final_match.refresh_from_db()
        self.assertEqual(final_match.home_team, self.teams[0])
        self.assertEqual(final_match.away_team, self.teams[3])


class LiveSubstitutionTestCase(TestCase):
    def setUp(self):
        self.team = Team.objects.create(name="Team Sub", budget=1000)
        self.player_out = self.team.players.create(name="Player Out", age=25, overall=80, base_stamina=85, position='CMF')
        self.player_in = self.team.players.create(name="Player In", age=22, overall=75, base_stamina=88, position='CMF')
        self.match = Match.objects.create(
            home_team=self.team,
            away_team=Team.objects.create(name="Opponent", budget=1000),
            status='LIVE'
        )

    def test_create_valid_substitution(self):
        from matches.serializers import LiveSubstitutionRequestSerializer
        data = {
            'match': self.match.id,
            'team': self.team.id,
            'player_out': self.player_out.id,
            'player_in': self.player_in.id,
            'minute': 60
        }
        serializer = LiveSubstitutionRequestSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        sub_req = serializer.save()
        self.assertEqual(sub_req.status, 'PENDING')
        self.assertEqual(sub_req.minute, 60)

    def test_create_substitution_for_finished_match(self):
        from matches.serializers import LiveSubstitutionRequestSerializer
        self.match.status = 'FINISHED'
        self.match.save()
        
        data = {
            'match': self.match.id,
            'team': self.team.id,
            'player_out': self.player_out.id,
            'player_in': self.player_in.id,
            'minute': 90
        }
        serializer = LiveSubstitutionRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("مجاز", str(serializer.errors))

    def test_create_substitution_for_invalid_team(self):
        from matches.serializers import LiveSubstitutionRequestSerializer
        other_team = Team.objects.create(name="Other", budget=100)
        data = {
            'match': self.match.id,
            'team': other_team.id,
            'player_out': self.player_out.id,
            'player_in': self.player_in.id,
            'minute': 45
        }
        serializer = LiveSubstitutionRequestSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("این تیم در مسابقه حضور ندارد.", str(serializer.errors))


class LiveMatchControlRoomTestCase(TestCase):
    def setUp(self):
        from django.utils import timezone
        import datetime
        self.team1 = Team.objects.create(name="Arsenal Test", budget=1000)
        self.team2 = Team.objects.create(name="Chelsea Test", budget=1000)
        self.player1 = self.team1.players.create(name="Saka Test", age=23, overall=88, base_stamina=90, position='RWF')
        self.match = Match.objects.create(
            home_team=self.team1,
            away_team=self.team2,
            status='SCHEDULED',
            half_status='1ST_HALF',
            date=timezone.now() + datetime.timedelta(minutes=10)
        )

    def test_live_match_context_t15_reminder(self):
        from rest_framework.test import APIClient
        client = APIClient()
        response = client.get('/api/matches/live-context/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data['has_active_match'])
        self.assertIsNotNone(data['next_match'])
        self.assertTrue(data['is_within_reminder_window'])
        self.assertLessEqual(data['time_to_kickoff_seconds'], 900)

    def test_admin_control_start_and_events(self):
        from rest_framework.test import APIClient
        client = APIClient()

        # Start match
        res_start = client.post(f'/api/matches/{self.match.id}/control/', {'action': 'START_MATCH'}, format='json')
        self.assertEqual(res_start.status_code, 200)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, 'LIVE')

        # Log goal event
        res_goal = client.post(f'/api/matches/{self.match.id}/control/', {
            'action': 'RECORD_EVENT',
            'event_type': 'GOAL',
            'player_id': self.player1.id,
            'minute': 23,
            'text': 'گل اول بازی'
        }, format='json')
        self.assertEqual(res_goal.status_code, 201)
        self.match.refresh_from_db()
        self.assertEqual(self.match.home_score, 1)

        # Trigger half time
        res_ht = client.post(f'/api/matches/{self.match.id}/control/', {'action': 'TRIGGER_HALF_TIME'}, format='json')
        self.assertEqual(res_ht.status_code, 200)
        self.match.refresh_from_db()
        self.assertEqual(self.match.half_status, 'HALF_TIME')

        # Conclude full time
        res_ft = client.post(f'/api/matches/{self.match.id}/control/', {'action': 'CONCLUDE_FULL_TIME'}, format='json')
        self.assertEqual(res_ft.status_code, 200)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, 'FINISHED')


class GameweekFilteringAndStatsTestCase(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.admin = User.objects.create_superuser(username='admin_gw', password='password123', email='admin_gw@vml.com')
        self.team1 = Team.objects.create(name="Team A", budget=1000)
        self.team2 = Team.objects.create(name="Team B", budget=1000)

        # Create matches for Week 1, Week 10, Week 11, Week 19
        self.m_w1 = Match.objects.create(home_team=self.team1, away_team=self.team2, round_name="هفته 1", status="SCHEDULED")
        self.m_w1_persian = Match.objects.create(home_team=self.team1, away_team=self.team2, round_name="هفته ۱", status="SCHEDULED")
        self.m_w10 = Match.objects.create(home_team=self.team1, away_team=self.team2, round_name="هفته 10", status="SCHEDULED")
        self.m_w11 = Match.objects.create(home_team=self.team1, away_team=self.team2, round_name="هفته 11", status="SCHEDULED")
        self.m_w19 = Match.objects.create(home_team=self.team1, away_team=self.team2, round_name="هفته 19", status="SCHEDULED")

    def test_normalize_round_query(self):
        from matches.views import normalize_round_query
        is_gw, r_num, names = normalize_round_query("1")
        self.assertTrue(is_gw)
        self.assertEqual(r_num, 1)
        self.assertIn("هفته 1", names)
        self.assertIn("هفته ۱", names)

        is_gw_p, r_num_p, names_p = normalize_round_query("هفته ۱")
        self.assertTrue(is_gw_p)
        self.assertEqual(r_num_p, 1)

        is_gw_cup, r_num_cup, names_cup = normalize_round_query("Quarter-Finals")
        self.assertFalse(is_gw_cup)
        self.assertEqual(names_cup, ["Quarter-Finals"])

    def test_admin_match_list_gameweek_filtering_no_overlap(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.admin)

        # Querying Week 1 (using ASCII "1")
        res = client.get('/api/matches/admin-list/?round=1')
        self.assertEqual(res.status_code, 200)
        match_ids = [m['id'] for m in res.data]
        self.assertIn(self.m_w1.id, match_ids)
        self.assertIn(self.m_w1_persian.id, match_ids)
        # CRITICAL: Must not contain Week 10, 11, 19
        self.assertNotIn(self.m_w10.id, match_ids)
        self.assertNotIn(self.m_w11.id, match_ids)
        self.assertNotIn(self.m_w19.id, match_ids)

        # Querying Week 1 (using Persian "هفته ۱")
        res_p = client.get('/api/matches/admin-list/?round=هفته ۱')
        self.assertEqual(res_p.status_code, 200)
        match_ids_p = [m['id'] for m in res_p.data]
        self.assertIn(self.m_w1.id, match_ids_p)
        self.assertIn(self.m_w1_persian.id, match_ids_p)
        self.assertNotIn(self.m_w10.id, match_ids_p)
        self.assertNotIn(self.m_w11.id, match_ids_p)

    def test_submit_team_stats_includes_saves(self):
        from rest_framework.test import APIClient
        from matches.models import MatchTeamStat
        client = APIClient()
        client.force_authenticate(user=self.admin)

        self.m_w1.status = 'FINISHED'
        self.m_w1.save()

        payload = {
            'team_id': self.team1.id,
            'possession_percent': 55,
            'shots': 12,
            'shots_on_target': 6,
            'corners': 4,
            'fouls': 8,
            'offsides': 2,
            'saves': 5,
        }
        res = client.post(f'/api/matches/{self.m_w1.id}/stats/team/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['saves'], 5)

        stat = MatchTeamStat.objects.get(match=self.m_w1, team=self.team1)
        self.assertEqual(stat.saves, 5)

    def test_active_live_match_context_retains_recent_finished_match(self):
        from rest_framework.test import APIClient
        client = APIClient()

        self.m_w1.status = 'FINISHED'
        self.m_w1.home_score = 3
        self.m_w1.away_score = 1
        self.m_w1.save()

        res = client.get('/api/matches/live-context/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsNotNone(data['recent_finished_match'])
        self.assertEqual(data['recent_finished_match']['id'], self.m_w1.id)
        self.assertEqual(data['last_finished_match']['id'], self.m_w1.id)



