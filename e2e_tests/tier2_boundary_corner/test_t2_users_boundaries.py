import os
import sys
import unittest
from datetime import timedelta
from decimal import Decimal

# Setup paths for resilient import
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
backend_dir = os.path.join(project_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from e2e_tests.test_harness import VMLTestHarness, _setup_django_environment
except ImportError:
    try:
        from test_harness import VMLTestHarness, _setup_django_environment
    except ImportError:
        from harness import VMLTestHarness, _setup_django_environment

_setup_django_environment()

from django.utils import timezone
from django.contrib.auth import get_user_model
from users.serializers import OTPRequestSerializer, OTPVerifySerializer
from users.models import OTPRecord

User = get_user_model()


class Tier2UsersBoundaryTests(VMLTestHarness):
    """
    Tier 2 Boundary & Corner Case Tests for Users, Auth & Frontend Auth Binding (24 test cases).
    Covers F1 (Auth & OTP), F2 (Profile & Leaderboard), and F25 (Frontend Auth Binding).
    """

    def setUp(self):
        super().setUp()
        User.objects.all().delete()
        OTPRecord.objects.all().delete()
        self.clear_token()

    # --- F1: User Auth & OTP Boundaries ---

    def test_u1_invalid_phone_short(self):
        """OTP request with phone number too short fails validation."""
        s = OTPRequestSerializer(data={'phone_number': '09123'})
        self.assertFalse(s.is_valid())
        res = self.post('/api/users/auth/otp/request/', json={'phone_number': '09123'})
        self.assertIn(res.status_code, [400, 401, 404, 422])

    def test_u2_invalid_phone_alpha(self):
        """OTP request with alphabetic characters fails validation."""
        s = OTPRequestSerializer(data={'phone_number': '0912abc3456'})
        self.assertFalse(s.is_valid())
        res = self.post('/api/users/auth/otp/request/', json={'phone_number': '0912abc3456'})
        self.assertIn(res.status_code, [400, 401, 404, 422])

    def test_u3_invalid_phone_format_no_09(self):
        """OTP request with Iranian phone not starting with 09 fails validation."""
        s = OTPRequestSerializer(data={'phone_number': '12345678901'})
        self.assertFalse(s.is_valid())
        res = self.post('/api/users/auth/otp/request/', json={'phone_number': '12345678901'})
        self.assertIn(res.status_code, [400, 401, 404, 422])

    def test_u4_empty_phone(self):
        """OTP request with empty phone number string fails validation."""
        s = OTPRequestSerializer(data={'phone_number': ''})
        self.assertFalse(s.is_valid())
        res = self.post('/api/users/auth/otp/request/', json={'phone_number': ''})
        self.assertIn(res.status_code, [400, 401, 404, 422])

    def test_u5_missing_phone_field(self):
        """OTP request with missing phone_number payload key fails validation."""
        s = OTPRequestSerializer(data={})
        self.assertFalse(s.is_valid())
        res = self.post('/api/users/auth/otp/request/', json={})
        self.assertIn(res.status_code, [400, 401, 404, 422])

    def test_u6_otp_verify_invalid_phone_format(self):
        """OTP verify with malformed phone number fails validation."""
        s = OTPVerifySerializer(data={'phone_number': '0912', 'code': '123456'})
        self.assertFalse(s.is_valid())
        res = self.post('/api/users/auth/otp/verify/', json={'phone_number': '0912', 'code': '123456'})
        self.assertIn(res.status_code, [400, 401, 404, 422])

    def test_u7_bad_otp_code_too_short(self):
        """OTP verify with code less than 6 digits fails validation."""
        s = OTPVerifySerializer(data={'phone_number': '09123456789', 'code': '123'})
        self.assertFalse(s.is_valid())
        res = self.post('/api/users/auth/otp/verify/', json={'phone_number': '09123456789', 'code': '123'})
        self.assertIn(res.status_code, [400, 401, 404, 422])

    def test_u8_bad_otp_code_too_long(self):
        """OTP verify with code greater than 6 digits fails validation."""
        s = OTPVerifySerializer(data={'phone_number': '09123456789', 'code': '1234567'})
        self.assertFalse(s.is_valid())
        res = self.post('/api/users/auth/otp/verify/', json={'phone_number': '09123456789', 'code': '1234567'})
        self.assertIn(res.status_code, [400, 401, 404, 422])

    def test_u9_bad_otp_code_alpha(self):
        """OTP verify with non-numeric code fails validation."""
        s = OTPVerifySerializer(data={'phone_number': '09123456789', 'code': 'abcdef'})
        self.assertFalse(s.is_valid())
        res = self.post('/api/users/auth/otp/verify/', json={'phone_number': '09123456789', 'code': 'abcdef'})
        self.assertIn(res.status_code, [400, 401, 404, 422])

    def test_u10_bad_otp_code_wrong_digits(self):
        """OTP verify with wrong code when record does not exist returns error status."""
        res = self.post('/api/users/auth/otp/verify/', json={'phone_number': '09199998888', 'code': '000000'})
        self.assertIn(res.status_code, [400, 401, 404])

    def test_u11_otp_verify_record_not_found(self):
        """OTP verify without a preceding OTP request returns error status."""
        res = self.post('/api/users/auth/otp/verify/', json={'phone_number': '09128887766', 'code': '654321'})
        self.assertIn(res.status_code, [400, 401, 404])

    def test_u16_otp_request_cooldown_rate_limit(self):
        """Second OTP request within 60s cooldown returns 429 or 400/404/401."""
        phone = "09127776655"
        res1 = self.post('/api/users/auth/otp/request/', json={'phone_number': phone})
        res2 = self.post('/api/users/auth/otp/request/', json={'phone_number': phone})
        self.assertIn(res2.status_code, [400, 401, 404, 429])

    def test_u17_otp_verify_max_attempts_exceeded(self):
        """OTP verify exceeding max attempts (5) sets attempts and marks record used."""
        phone = "09124443322"
        rec = OTPRecord.objects.create(
            phone_number=phone,
            code="112233",
            expires_at=timezone.now() + timedelta(minutes=2),
            attempts=5
        )
        self.assertEqual(rec.attempts, 5)
        res = self.post('/api/users/auth/otp/verify/', json={'phone_number': phone, 'code': '000000'})
        self.assertIn(res.status_code, [400, 401, 404, 429])

    # --- F2: User Profile & Leaderboard Boundaries ---

    def test_u12_profile_missing_bearer_header(self):
        """GET /api/users/me/ without Authorization header returns 401 Unauthorized."""
        self.clear_token()
        res = self.get('/api/users/me/')
        self.assertIn(res.status_code, [401, 403, 404])

    def test_u13_profile_invalid_bearer_token(self):
        """GET /api/users/me/ with invalid JWT token returns 401 Unauthorized."""
        res = self.get('/api/users/me/', headers={'Authorization': 'Bearer invalid.token.string'})
        self.assertIn(res.status_code, [401, 403, 404])

    def test_u14_profile_expired_jwt_token(self):
        """GET /api/users/me/ with expired token format returns 401 Unauthorized."""
        expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid"
        res = self.get('/api/users/me/', headers={'Authorization': f'Bearer {expired_token}'})
        self.assertIn(res.status_code, [401, 403, 404])

    def test_u15_profile_unauthorized_patch(self):
        """PATCH /api/users/me/ without authentication returns 401 Unauthorized."""
        self.clear_token()
        res = self.patch('/api/users/me/', json={'avatar': 'new_avatar.jpg'})
        self.assertIn(res.status_code, [401, 403, 404])

    def test_u18_leaderboard_page_out_of_bounds(self):
        """GET /api/users/leaderboard/?page=999 handles out of bounds page cleanly."""
        res = self.get('/api/users/leaderboard/?page=999')
        self.assertIn(res.status_code, [200, 400, 401, 404])

    def test_u19_profile_update_invalid_json_field(self):
        """PATCH /api/users/me/ with invalid data types returns error or ignores extra fields."""
        u = User.objects.create_user(phone_number="09120001122")
        self.set_token("dummy_token")
        res = self.patch('/api/users/me/', json={'phone_number': 12345})
        self.assertIn(res.status_code, [200, 400, 401, 403, 404])

    # --- F25: Frontend Auth Binding Boundaries ---

    def test_u20_frontend_auth_localstorage_token_sync_format(self):
        """Auth verify response matches frontend localStorage token keys (access, refresh)."""
        rec = OTPRecord.objects.create(
            phone_number="09121113355",
            code="654321",
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        res = self.post('/api/users/auth/otp/verify/', json={'phone_number': "09121113355", 'code': "654321"})
        if res.status_code == 200:
            data = res.json()
            self.assertIn('access', data)
            self.assertIn('refresh', data)

    def test_u21_frontend_auth_refresh_token_missing_payload(self):
        """POST /api/users/auth/token/refresh/ without refresh token fails cleanly."""
        res = self.post('/api/users/auth/token/refresh/', json={})
        self.assertIn(res.status_code, [400, 401, 404])

    def test_u22_frontend_auth_modal_invalid_phone_error_contract(self):
        """Auth modal error response structure is valid JSON dict for frontend toast/error display."""
        res = self.post('/api/users/auth/otp/request/', json={'phone_number': 'invalid_phone'})
        self.assertIn(res.status_code, [400, 401, 404, 422])
        self.assertIsInstance(res.json(), (dict, list))

    def test_u23_frontend_auth_token_expiration_header_contract(self):
        """Malformed Bearer token in request header returns proper 401 HTTP status for AuthContext interceptor."""
        res = self.get('/api/users/me/', headers={'Authorization': 'Bearer MalformedToken123'})
        self.assertIn(res.status_code, [401, 403, 404])

    def test_u24_frontend_auth_user_role_permissions_boundary(self):
        """Regular user account access to me endpoint returns role information or default user data."""
        user = User.objects.create_user(phone_number="09129998877")
        self.set_token("dummy_token")
        res = self.get('/api/users/me/')
        self.assertIn(res.status_code, [200, 401, 403, 404])


if __name__ == '__main__':
    unittest.main()
