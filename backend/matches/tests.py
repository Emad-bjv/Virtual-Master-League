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

