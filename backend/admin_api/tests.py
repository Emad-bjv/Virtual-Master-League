from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from core.models import GlobalSettings
from teams.models import Team, Player, ClubFacilities
from matches.models import Match, LeagueStanding
from audit.models import AdminAuditLog
from decimal import Decimal

User = get_user_model()

class AdminControlCenterTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Superadmin user
        self.superadmin = User.objects.create_superuser(
            username='senior_admin',
            password='Password123!',
            role='admin'
        )
        
        # Regular admin
        self.regular_admin = User.objects.create_user(
            username='junior_admin',
            password='Password123!',
            role='admin',
            is_staff=True,
            is_superuser=False
        )

        # Coach user
        self.coach = User.objects.create_user(
            username='coach_user',
            password='Password123!',
            role='coach'
        )

        # Create demo team & facilities
        self.team = Team.objects.create(
            name='تیم آزمایشی',
            budget=Decimal('50000000.00'),
            wage_cap=Decimal('20000.00')
        )
        self.facilities = ClubFacilities.objects.create(
            team=self.team,
            training_camp_level=5,
            gym_level=3,
            medical_level=4
        )

    def test_public_feature_flags(self):
        """Test that anyone can read public feature flags without authentication."""
        res = self.client.get('/api/core/feature-flags/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('feature_transfer_market', res.data)
        self.assertIn('feature_store', res.data)
        self.assertTrue(res.data['feature_transfer_market'])

    def test_feature_flags_get_and_patch(self):
        """Test that superadmin can update feature flags and audit log is created."""
        self.client.force_authenticate(user=self.superadmin)
        
        # GET
        res = self.client.get('/api/admin/feature-flags/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['can_edit'])

        # PATCH
        patch_res = self.client.patch('/api/admin/feature-flags/', {
            'feature_transfer_market': False,
            'feature_store': False,
            'site_title': 'لیگ حرفه‌ای مستر'
        }, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertFalse(patch_res.data['flags']['feature_transfer_market'])
        self.assertFalse(patch_res.data['flags']['feature_store'])

        # Verify audit log was created
        log = AdminAuditLog.objects.filter(action_type='FEATURE_FLAGS_UPDATED').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.admin_user, self.superadmin)

    def test_system_settings_validation(self):
        """Test system settings update and gacha 100% rate validation."""
        self.client.force_authenticate(user=self.superadmin)

        # Invalid gacha rates sum != 100%
        invalid_res = self.client.patch('/api/admin/system-settings/', {
            'gacha_rate_rare': '70.00',
            'gacha_rate_epic': '25.00',
            'gacha_rate_legendary': '10.00' # sum = 105%
        }, format='json')
        self.assertEqual(invalid_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid gacha rates sum == 100%
        valid_res = self.client.patch('/api/admin/system-settings/', {
            'default_team_budget': '35000000.00',
            'gacha_rate_rare': '65.00',
            'gacha_rate_epic': '25.00',
            'gacha_rate_legendary': '10.00',
            'half_duration_minutes': 40
        }, format='json')
        self.assertEqual(valid_res.status_code, status.HTTP_200_OK)
        self.assertEqual(float(valid_res.data['settings']['default_team_budget']), 35000000.0)

    def test_reset_actions_security_and_execution(self):
        """Test reset actions require exact confirmation 'ریست' and work properly."""
        self.client.force_authenticate(user=self.superadmin)

        # 1. Invalid confirmation fails
        fail_res = self.client.post('/api/admin/reset/reset-budgets/', {
            'confirmation': 'yes'
        }, format='json')
        self.assertEqual(fail_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Valid confirmation succeeds for budget reset
        success_res = self.client.post('/api/admin/reset/reset-budgets/', {
            'confirmation': 'ریست'
        }, format='json')
        self.assertEqual(success_res.status_code, status.HTTP_200_OK)
        self.team.refresh_from_db()
        self.assertEqual(self.team.budget, Decimal('30000000.00'))

        # 3. Facilities reset
        fac_res = self.client.post('/api/admin/reset/reset-facilities/', {
            'confirmation': 'ریست'
        }, format='json')
        self.assertEqual(fac_res.status_code, status.HTTP_200_OK)
        self.facilities.refresh_from_db()
        self.assertEqual(self.facilities.training_camp_level, 0)
        self.assertEqual(self.facilities.gym_level, 0)
        self.assertEqual(self.facilities.medical_level, 0)

        # 4. Stamina & Fatigue reset
        player = Player.objects.create(
            team=self.team,
            name='خسته و مصدوم',
            age=26,
            position='CF',
            overall=85,
            base_stamina=80,
            virtual_stamina=Decimal('25.00'),
            is_locked=True,
            is_injured=True,
            consecutive_games=4
        )
        stam_res = self.client.post('/api/admin/reset/reset-stamina/', {
            'confirmation': 'ریست'
        }, format='json')
        self.assertEqual(stam_res.status_code, status.HTTP_200_OK)
        player.refresh_from_db()
        self.assertEqual(float(player.virtual_stamina), 100.0)
        self.assertFalse(player.is_locked)
        self.assertFalse(player.is_injured)
        self.assertIsNone(player.injury_return_date)
        self.assertEqual(player.consecutive_games, 0)
