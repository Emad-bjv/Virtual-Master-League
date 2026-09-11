from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User, AdminProfile
from teams.models import Team


class AdminRBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Superadmin user
        self.superadmin = User.objects.create(
            username='super_boss',
            role='superadmin',
            is_staff=True,
            is_superuser=True
        )
        self.superadmin.set_password('pass123')
        self.superadmin.save()
        AdminProfile.objects.create(
            user=self.superadmin,
            admin_role='superadmin',
            title='مدیر کل سامانه',
            permissions=['*']
        )

        # 2. Regular Coach
        self.coach = User.objects.create(
            username='regular_coach',
            role='coach',
            is_staff=False,
            is_superuser=False
        )
        self.coach.set_password('pass123')
        self.coach.save()

        # 3. Referee Admin
        self.referee = User.objects.create(
            username='referee_reza',
            role='admin',
            is_staff=True,
            is_superuser=False
        )
        self.referee.set_password('pass123')
        self.referee.save()
        AdminProfile.objects.create(
            user=self.referee,
            admin_role='referee',
            title='داور لیگ',
            permissions=[
                'panel_dashboard_live_referee',
                'panel_dashboard_rapid_stats',
                'sensitive_match_tampering'
            ]
        )

        # 4. Financial Admin
        self.fin_admin = User.objects.create(
            username='finance_ali',
            role='admin',
            is_staff=True,
            is_superuser=False
        )
        self.fin_admin.set_password('pass123')
        self.fin_admin.save()
        AdminProfile.objects.create(
            user=self.fin_admin,
            admin_role='financial_manager',
            title='مدیر مالی',
            permissions=[
                'panel_dashboard_transactions',
                'panel_dashboard_airdrop',
                'sensitive_financial_approve',
                'sensitive_grant_rewards',
                'sensitive_club_finances_manage'
            ]
        )

        # Sample Team
        self.team = Team.objects.create(
            name='تست اف‌سی',
            manager=self.coach,
            budget=Decimal('1000000.00'),
            gems=100
        )

    def test_regular_coach_cannot_access_admin_management(self):
        self.client.force_authenticate(user=self.coach)
        res = self.client.get('/api/users/admins/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_referee_cannot_access_admin_management(self):
        self.client.force_authenticate(user=self.referee)
        res = self.client.get('/api/users/admins/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_superadmin_can_list_and_create_admin(self):
        self.client.force_authenticate(user=self.superadmin)
        res = self.client.get('/api/users/admins/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(a['username'] == 'referee_reza' for a in res.data))

        # Create new admin
        create_res = self.client.post('/api/users/admins/', {
            'username': 'new_transfer_guy',
            'password': 'password123',
            'full_name': 'مدیر ترنسفر جدید',
            'admin_role': 'transfer_manager',
            'title': 'مسئول بازار نقل‌وانتقالات',
            'permissions': ['panel_admin_squad_transfers', 'panel_admin_packs']
        }, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_res.data['admin_profile']['admin_role'], 'transfer_manager')

    def test_promote_existing_coach_to_admin(self):
        self.client.force_authenticate(user=self.superadmin)
        res = self.client.post('/api/users/admins/', {
            'user_id': self.coach.id,
            'admin_role': 'referee',
            'title': 'داور کمکی',
            'permissions': ['panel_dashboard_live_referee']
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.coach.refresh_from_db()
        self.assertEqual(self.coach.role, 'admin')
        self.assertTrue(self.coach.has_admin_perm('panel_dashboard_live_referee'))
        self.assertFalse(self.coach.has_admin_perm('sensitive_financial_approve'))

    def test_superadmin_protection_against_demotion(self):
        # Even if someone has permission to manage admins, they CANNOT demote superadmin
        self.referee.admin_profile.permissions.append('sensitive_admin_rbac_manage')
        self.referee.admin_profile.save()

        self.client.force_authenticate(user=self.referee)
        res = self.client.delete(f'/api/users/admins/{self.superadmin.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Cannot demote self
        res_self = self.client.delete(f'/api/users/admins/{self.referee.id}/')
        self.assertEqual(res_self.status_code, status.HTTP_400_BAD_REQUEST)

    def test_referee_blocked_from_granting_mass_rewards(self):
        self.client.force_authenticate(user=self.referee)
        res = self.client.post('/api/economy/admin/mass-reward/', {
            'title': 'پاداش غیرمجاز',
            'gems_amount': 500,
            'target_type': 'ALL'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_financial_admin_can_grant_mass_rewards(self):
        self.client.force_authenticate(user=self.fin_admin)
        res = self.client.post('/api/economy/admin/mass-reward/', {
            'title': 'پاداش مجاز',
            'gems_amount': 100,
            'budget_amount': 250000,
            'target_type': 'ALL'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_referee_blocked_from_editing_club_budget(self):
        self.client.force_authenticate(user=self.referee)
        res = self.client.patch(f'/api/admin/teams/{self.team.id}/', {
            'budget': '999999999.00'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_financial_admin_can_edit_club_budget(self):
        self.client.force_authenticate(user=self.fin_admin)
        res = self.client.patch(f'/api/admin/teams/{self.team.id}/', {
            'budget': '5000000.00'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.team.refresh_from_db()
        self.assertEqual(float(self.team.budget), 5000000.0)
