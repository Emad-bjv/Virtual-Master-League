from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, OTPRecord
from .serializers import normalize_phone_number


class PhoneNormalizationTest(TestCase):
    def test_phone_number_normalization(self):
        self.assertEqual(normalize_phone_number("09123456789"), "09123456789")
        self.assertEqual(normalize_phone_number("+989123456789"), "09123456789")
        self.assertEqual(normalize_phone_number("00989123456789"), "09123456789")
        self.assertEqual(normalize_phone_number("989123456789"), "09123456789")
        self.assertEqual(normalize_phone_number("۰۹۱۲۳۴۵۶۷۸۹"), "09123456789")
        self.assertEqual(normalize_phone_number("0912 345 6789"), "09123456789")


class UserModelTest(TestCase):
    def test_user_creation_defaults(self):
        user = User.objects.create_user(phone_number="09123456789")
        self.assertEqual(user.virtual_dollars, 1000000.00)
        self.assertEqual(user.role, 'coach')
        self.assertEqual(user.rank, 0)
        self.assertEqual(user.points, 0)
        self.assertFalse(user.is_staff)


class OTPViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.phone = "09121112233"
        cache.clear()

    def test_otp_request_and_cooldown(self):
        url = reverse('otp-request')
        response = self.client.post(url, {'phone_number': self.phone}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check OTPRecord generated in DB
        otp_record = OTPRecord.objects.filter(phone_number=self.phone).latest('created_at')
        otp_code = otp_record.code
        self.assertEqual(len(otp_code), 6)
        self.assertTrue(otp_code.isdigit())
        self.assertEqual(cache.get(f"otp_code:{self.phone}"), otp_code)

        # Second request within 60s should return HTTP 429
        response_cooldown = self.client.post(url, {'phone_number': self.phone}, format='json')
        self.assertEqual(response_cooldown.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_otp_verify_success(self):
        # Request OTP
        req_url = reverse('otp-request')
        req_resp = self.client.post(req_url, {'phone_number': self.phone}, format='json')
        self.assertEqual(req_resp.status_code, status.HTTP_200_OK)

        # Retrieve dynamic code from DB OTPRecord
        otp_record = OTPRecord.objects.filter(phone_number=self.phone).latest('created_at')
        otp_code = otp_record.code

        # Verify OTP with dynamic code
        verify_url = reverse('otp-verify')
        response = self.client.post(verify_url, {'phone_number': self.phone, 'code': otp_code}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['phone_number'], self.phone)
        self.assertEqual(response.data['user']['virtual_dollars'], "1000000.00")

    def test_otp_verify_invalid_code(self):
        now = timezone.now()
        OTPRecord.objects.create(phone_number=self.phone, code="654321", expires_at=now + timedelta(seconds=300))
        cache.set(f"otp_code:{self.phone}", "654321", 300)

        verify_url = reverse('otp-verify')
        response = self.client.post(verify_url, {'phone_number': self.phone, 'code': '999999'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_otp_verify_backdoor_prevention(self):
        # Set DB code and cache to "876543" (not "123456")
        now = timezone.now()
        OTPRecord.objects.create(phone_number=self.phone, code="876543", expires_at=now + timedelta(seconds=300))
        cache.set(f"otp_code:{self.phone}", "876543", 300)

        verify_url = reverse('otp-verify')
        # Attempting to use hardcoded "123456" must fail when real code is "876543"
        response = self.client.post(verify_url, {'phone_number': self.phone, 'code': '123456'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], "کد تایید وارد شده اشتباه است.")

    def test_otp_verify_max_attempts_exceeded(self):
        now = timezone.now()
        OTPRecord.objects.create(phone_number=self.phone, code="888999", expires_at=now + timedelta(seconds=300))
        cache.set(f"otp_code:{self.phone}", "888999", 300)
        verify_url = reverse('otp-verify')

        # 5 failed attempts
        for _ in range(5):
            res = self.client.post(verify_url, {'phone_number': self.phone, 'code': '000000'}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 6th attempt should return rate limit error and code key deleted
        res = self.client.post(verify_url, {'phone_number': self.phone, 'code': '888999'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNone(cache.get(f"otp_code:{self.phone}"))


class ProfileAndLeaderboardApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(phone_number="09129998877", points=150, virtual_dollars=1200000.00)
        self.user2 = User.objects.create_user(phone_number="09129998866", points=300, virtual_dollars=1500000.00)
        self.token = str(RefreshToken.for_user(self.user).access_token)

    def test_profile_me_unauthorized(self):
        url = reverse('user-me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_me_authenticated(self):
        url = reverse('user-me')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['phone_number'], self.user.phone_number)
        self.assertEqual(response.data['points'], 150)

    def test_profile_patch_read_only_fields_protection(self):
        url = reverse('user-me')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        patch_data = {
            'role': 'admin',
            'rank': 1,
            'points': 99999,
            'virtual_dollars': 9999999,
            'avatar': 'new_avatar.jpg'
        }
        response = self.client.patch(url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        # Verify read-only fields were NOT updated
        self.assertEqual(self.user.role, 'coach')
        self.assertEqual(self.user.rank, 0)
        self.assertEqual(self.user.points, 150)
        self.assertEqual(float(self.user.virtual_dollars), 1200000.00)
        # Verify writable field (avatar) WAS updated
        self.assertEqual(self.user.avatar, 'new_avatar.jpg')

    def test_leaderboard(self):
        url = reverse('user-leaderboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # Higher points first (user2 has 300 points)
        self.assertEqual(response.data[0]['phone_number'], self.user2.phone_number)
        self.assertEqual(response.data[0]['rank'], 1)
        self.assertEqual(response.data[1]['phone_number'], self.user.phone_number)
        self.assertEqual(response.data[1]['rank'], 2)
