import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from teams.models import Team
from matches.models import Tournament, Match
from matches.cup_engine import generate_cup_bracket, advance_winner

User = get_user_model()

class CupAdminManagementTestCase(TestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username='admin_test',
            password='Password123!',
            email='admin@test.com'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin_user)

        self.cup_tourney = Tournament.objects.create(
            name='جام حذفی تست',
            tournament_type='CUP',
            is_active=True
        )

        self.teams = []
        for i in range(4):
            t = Team.objects.create(name=f'تیم حذفی {i+1}', is_active=True)
            self.teams.append(t)

        # Generate 4-team bracket: 2 semi-finals and 1 final
        res = generate_cup_bracket(self.cup_tourney, self.teams)
        self.assertTrue(res['success'])

    def test_admin_match_list_filters(self):
        # 1. Filter by tournament_type=CUP
        resp = self.client.get(f'/api/matches/admin-list/?tournament_type=CUP')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        matches = data if isinstance(data, list) else data.get('results', [])
        self.assertEqual(len(matches), 3) # 2 semi-finals + 1 final

        # 2. Filter by round="نیمه‌نهایی"
        resp = self.client.get('/api/matches/admin-list/?tournament_type=CUP&round=نیمه‌نهایی')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        matches = data if isinstance(data, list) else data.get('results', [])
        self.assertEqual(len(matches), 2)

    def test_admin_match_update_with_penalties_and_auto_advance(self):
        semi_matches = list(Match.objects.filter(tournament=self.cup_tourney, round_name='نیمه‌نهایی').order_by('id'))
        m1 = semi_matches[0]
        final_match = m1.next_match
        self.assertIsNotNone(final_match)
        self.assertIsNone(final_match.home_team)

        # Update match with draw in regulation and penalty victory for home team
        resp = self.client.put(f'/api/matches/{m1.id}/admin-update/', {
            'home_score': 2,
            'away_score': 2,
            'home_penalties': 5,
            'away_penalties': 4,
            'status': 'FINISHED',
            'half_status': 'FINISHED'
        }, format='json')
        self.assertEqual(resp.status_code, 200)

        # Refresh from db
        m1.refresh_from_db()
        self.assertEqual(m1.status, 'FINISHED')
        self.assertEqual(m1.home_penalties, 5)
        self.assertEqual(m1.away_penalties, 4)

        # Verify auto-advancement: Home team should now be set in final_match!
        final_match.refresh_from_db()
        self.assertEqual(final_match.home_team, m1.home_team)

    def test_control_room_extra_time_penalties_and_conclude(self):
        semi_matches = list(Match.objects.filter(tournament=self.cup_tourney, round_name='نیمه‌نهایی').order_by('id'))
        m2 = semi_matches[1]

        # 1. Start Extra Time
        resp = self.client.post(f'/api/matches/{m2.id}/control/', {'action': 'START_EXTRA_TIME', 'minute': 91})
        self.assertEqual(resp.status_code, 200)
        m2.refresh_from_db()
        self.assertEqual(m2.half_status, 'EXTRA_TIME')
        self.assertEqual(m2.status, 'LIVE')

        # 2. Start Penalties
        resp = self.client.post(f'/api/matches/{m2.id}/control/', {'action': 'START_PENALTIES'})
        self.assertEqual(resp.status_code, 200)
        m2.refresh_from_db()
        self.assertEqual(m2.half_status, 'PENALTIES')

        # 3. Record Penalty Shootout
        resp = self.client.post(f'/api/matches/{m2.id}/control/', {
            'action': 'RECORD_PENALTY_SHOOTOUT',
            'home_penalties': 3,
            'away_penalties': 4
        })
        self.assertEqual(resp.status_code, 200)
        m2.refresh_from_db()
        self.assertEqual(m2.home_penalties, 3)
        self.assertEqual(m2.away_penalties, 4)

        # 4. Conclude Full Time
        resp = self.client.post(f'/api/matches/{m2.id}/control/', {'action': 'CONCLUDE_FULL_TIME'})
        self.assertEqual(resp.status_code, 200)
        m2.refresh_from_db()
        self.assertEqual(m2.status, 'FINISHED')

        # Away team won penalties (4 > 3), should be advanced to final_match.away_team!
        final_match = m2.next_match
        final_match.refresh_from_db()
        self.assertEqual(final_match.away_team, m2.away_team)
