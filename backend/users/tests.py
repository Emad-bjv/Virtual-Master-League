from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User


class UserModelTest(TestCase):
    def test_user_creation_defaults(self):
        user = User.objects.create_user(username="coach_test", password="Password123!")
        self.assertEqual(user.virtual_dollars, 1000000.00)
        self.assertEqual(user.role, 'coach')
        self.assertEqual(user.rank, 0)
        self.assertEqual(user.points, 0)
        self.assertFalse(user.is_staff)
        self.assertTrue(user.check_password("Password123!"))


class AuthViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="coach_arsenal", password="Password123!")

    def test_password_login_success(self):
        url = reverse('password-login')
        response = self.client.post(url, {'username': 'coach_arsenal', 'password': 'Password123!'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['username'], 'coach_arsenal')

    def test_password_login_failure(self):
        url = reverse('password-login')
        response = self.client.post(url, {'username': 'coach_arsenal', 'password': 'wrongpassword'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_user_login(self):
        url = reverse('password-login')
        response = self.client.post(url, {'username': 'unknown_user_123', 'password': 'Password123!'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.filter(username='unknown_user_123').exists())


class UserProfileAndLeaderboardTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="coach_milan", points=150, virtual_dollars=1200000.00)
        self.user2 = User.objects.create_user(username="coach_inter", points=300, virtual_dollars=1500000.00)

    def test_profile_authenticated(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('user-me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], self.user.username)

    def test_leaderboard(self):
        url = reverse('user-leaderboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['username'], self.user2.username)
        self.assertEqual(response.data[1]['username'], self.user.username)
