"""
Test: Verify submit_gameplan round-trip (all 14 tactic fields).
Run with: python manage.py test teams.test_gameplan_roundtrip --verbosity=2
"""
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from users.models import User
from teams.models import Team, ClubFacilities


@override_settings(ALLOWED_HOSTS=['*'])
class GameplanRoundtripTest(TestCase):
    """Verify that all 14 tactic fields survive a POST → GET round-trip."""

    def setUp(self):
        self.user = User.objects.create_user(username='coach_roundtrip')
        self.team = Team.objects.create(name='Test FC', manager=self.user)
        ClubFacilities.objects.create(team=self.team)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_all_14_fields_roundtrip(self):
        """POST 14 tactic fields + formation, then GET and verify all match."""
        tactics_payload = {
            'formation': '4-3-3',
            'attacking_style': '\u0636\u062f \u062d\u0645\u0644\u0647',
            'build_up': '\u067e\u0627\u0633 \u0628\u0644\u0646\u062f',
            'attacking_area': '\u06a9\u0646\u0627\u0631\u0647',
            'positioning': '\u0634\u0646\u0627\u0648\u0631',
            'support_range': 5,
            'defensive_style': '\u0647\u0645\u0647 \u062f\u0641\u0627\u0639',
            'containment_area': '\u06a9\u0646\u0627\u0631\u0647',
            'pressing': '\u0645\u062d\u0627\u0641\u0638\u0647\u200c\u06a9\u0627\u0631\u0627\u0646\u0647',
            'defensive_line': 4,
            'compactness': 8,
            'adv_offense_1': '\u062a\u06cc\u06a9\u06cc \u062a\u0627\u06a9\u0627',
            'adv_offense_2': '\u0634\u0645\u0627\u0631\u0647 \u06f9 \u06a9\u0627\u0630\u0628',
            'adv_defense_1': '\u062e\u0637 \u062f\u0641\u0627\u0639\u06cc \u0639\u0645\u06cc\u0642',
            'adv_defense_2': '\u0641\u0634\u0627\u0631',
        }

        # POST
        response = self.client.post(
            '/api/teams/{}/submit_gameplan/'.format(self.team.id),
            data={'tactics': tactics_payload, 'players': []},
            format='json'
        )
        self.assertEqual(response.status_code, 200, response.data)

        # GET
        response_get = self.client.get('/api/teams/{}/submit_gameplan/'.format(self.team.id))
        self.assertEqual(response_get.status_code, 200)
        gp = response_get.data['gameplan']

        # Verify each field
        for field, expected_val in tactics_payload.items():
            actual_val = gp.get(field)
            self.assertEqual(
                str(actual_val), str(expected_val),
                'Field {} mismatch: expected [{}], got [{}]'.format(field, expected_val, actual_val)
            )

        # Verify is_submitted was set
        self.assertTrue(gp.get('is_submitted'), 'is_submitted should be True after submission')

    def test_partial_update_preserves_other_fields(self):
        """Submitting only a few fields should not reset the others."""
        # First submission with all fields
        full_payload = {
            'formation': '4-3-3',
            'attacking_style': '\u0636\u062f \u062d\u0645\u0644\u0647',
            'build_up': '\u067e\u0627\u0633 \u0628\u0644\u0646\u062f',
            'attacking_area': '\u06a9\u0646\u0627\u0631\u0647',
            'positioning': '\u0634\u0646\u0627\u0648\u0631',
            'support_range': 5,
            'defensive_style': '\u0647\u0645\u0647 \u062f\u0641\u0627\u0639',
            'containment_area': '\u06a9\u0646\u0627\u0631\u0647',
            'pressing': '\u0645\u062d\u0627\u0641\u0638\u0647\u200c\u06a9\u0627\u0631\u0627\u0646\u0647',
            'defensive_line': 4,
            'compactness': 8,
            'adv_offense_1': '\u062a\u06cc\u06a9\u06cc \u062a\u0627\u06a9\u0627',
            'adv_offense_2': '\u0634\u0645\u0627\u0631\u0647 \u06f9 \u06a9\u0627\u0630\u0628',
            'adv_defense_1': '\u062e\u0637 \u062f\u0641\u0627\u0639\u06cc \u0639\u0645\u06cc\u0642',
            'adv_defense_2': '\u0641\u0634\u0627\u0631',
        }
        self.client.post(
            '/api/teams/{}/submit_gameplan/'.format(self.team.id),
            data={'tactics': full_payload, 'players': []},
            format='json'
        )

        # Second submission: only change formation
        partial_payload = {'formation': '3-5-2'}
        response = self.client.post(
            '/api/teams/{}/submit_gameplan/'.format(self.team.id),
            data={'tactics': partial_payload, 'players': []},
            format='json'
        )
        self.assertEqual(response.status_code, 200)

        gp = response.data['gameplan']
        self.assertEqual(gp['formation'], '3-5-2')
        # Other fields should be preserved
        self.assertEqual(gp['attacking_style'], '\u0636\u062f \u062d\u0645\u0644\u0647')
        self.assertEqual(gp['defensive_line'], 4)

    def test_old_field_names_are_ignored(self):
        """Sending old field names should NOT cause errors (they are just ignored)."""
        old_payload = {
            'play_style': '\u0628\u0627\u0632\u06cc \u0645\u0627\u0644\u06a9\u0627\u0646\u0647',
            'defensive_press': '\u0641\u0634\u0627\u0631',
            'attacking_level': '\u062a\u0647\u0627\u062c\u0645\u06cc',
            'offside_trap': True,
        }
        response = self.client.post(
            '/api/teams/{}/submit_gameplan/'.format(self.team.id),
            data={'tactics': old_payload, 'players': []},
            format='json'
        )
        # Should succeed (partial update with no recognized writable fields just saves is_submitted)
        self.assertEqual(response.status_code, 200)
