from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from teams.models import Team
from matches.models import Match
from notifications.models import Notification
from notifications.serializers import NotificationSerializer

User = get_user_model()


class NotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_superuser(username='admin', password='password123', email='admin@vml.com')
        self.coach_user = User.objects.create_user(username='coach1', password='password123', email='coach1@vml.com')
        self.team1 = Team.objects.create(name='Persepolis', manager=self.coach_user, budget=1000)
        self.team2 = Team.objects.create(name='Esteghlal', budget=1000)
        self.match = Match.objects.create(
            home_team=self.team1,
            away_team=self.team2,
            round_name='هفته 1',
            status='SCHEDULED'
        )

    def test_create_notification_with_new_fields(self):
        notif = Notification.objects.create(
            team=self.team1,
            match=self.match,
            target_role='COACH',
            action_url='/dashboard?tab=live',
            category='MATCH',
            title='بازی نزدیک است',
            message='ترکیب خود را ثبت کنید.'
        )
        self.assertEqual(notif.match, self.match)
        self.assertEqual(notif.target_role, 'COACH')
        self.assertEqual(notif.action_url, '/dashboard?tab=live')
        self.assertFalse(notif.is_dismissed)
        self.assertIsNone(notif.dismissed_at)

        serializer_data = NotificationSerializer(notif).data
        self.assertEqual(serializer_data['target_role'], 'COACH')
        self.assertEqual(serializer_data['action_url'], '/dashboard?tab=live')
        self.assertEqual(serializer_data['match'], self.match.id)
        self.assertFalse(serializer_data['is_dismissed'])

    def test_dismiss_notification_endpoint(self):
        notif = Notification.objects.create(
            team=self.team1,
            match=self.match,
            target_role='COACH',
            title='هشدار شروع بازی',
            message='۱۵ دقیقه تا بازی باقی مانده'
        )
        self.client.force_authenticate(user=self.coach_user)
        response = self.client.post(f'/api/notifications/{notif.id}/dismiss/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'dismissed')
        self.assertEqual(response.data['id'], notif.id)

        notif.refresh_from_db()
        self.assertTrue(notif.is_dismissed)
        self.assertIsNotNone(notif.dismissed_at)

    def test_inbox_role_filtering(self):
        # Create notifications with different roles
        n_all = Notification.objects.create(title='System All', target_role='ALL', team=None)
        n_admin = Notification.objects.create(title='Admin Alert', target_role='ADMIN', team=None)
        n_coach1 = Notification.objects.create(title='Coach Persepolis', target_role='COACH', team=self.team1)
        n_coach2 = Notification.objects.create(title='Coach Esteghlal', target_role='COACH', team=self.team2)

        # 1. Anonymous user: sees only ALL system-wide
        client_anon = APIClient()
        res_anon = client_anon.get('/api/notifications/inbox/')
        self.assertEqual(res_anon.status_code, status.HTTP_200_OK)
        titles_anon = [n['title'] for n in res_anon.data]
        self.assertIn('System All', titles_anon)
        self.assertNotIn('Admin Alert', titles_anon)
        self.assertNotIn('Coach Persepolis', titles_anon)
        self.assertNotIn('Coach Esteghlal', titles_anon)

        # 2. Admin user: sees ALL + ADMIN
        client_admin = APIClient()
        client_admin.force_authenticate(user=self.admin_user)
        res_admin = client_admin.get('/api/notifications/inbox/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        titles_admin = [n['title'] for n in res_admin.data]
        self.assertIn('System All', titles_admin)
        self.assertIn('Admin Alert', titles_admin)
        self.assertNotIn('Coach Persepolis', titles_admin) # COACH role is not in ADMIN+ALL

        # 3. Coach user (team1): sees ALL + COACH for team1
        client_coach = APIClient()
        client_coach.force_authenticate(user=self.coach_user)
        res_coach = client_coach.get('/api/notifications/inbox/')
        self.assertEqual(res_coach.status_code, status.HTTP_200_OK)
        titles_coach = [n['title'] for n in res_coach.data]
        self.assertIn('System All', titles_coach)
        self.assertIn('Coach Persepolis', titles_coach)
        self.assertNotIn('Admin Alert', titles_coach)
        self.assertNotIn('Coach Esteghlal', titles_coach)

    def test_inbox_dismissed_filtering(self):
        n_active = Notification.objects.create(title='Active Notif', target_role='ALL', team=None, is_dismissed=False)
        n_dismissed = Notification.objects.create(title='Dismissed Notif', target_role='ALL', team=None, is_dismissed=True, dismissed_at=timezone.now())

        res_undismissed = self.client.get('/api/notifications/inbox/?dismissed=false')
        self.assertEqual(res_undismissed.status_code, status.HTTP_200_OK)
        titles = [n['title'] for n in res_undismissed.data]
        self.assertIn('Active Notif', titles)
        self.assertNotIn('Dismissed Notif', titles)

