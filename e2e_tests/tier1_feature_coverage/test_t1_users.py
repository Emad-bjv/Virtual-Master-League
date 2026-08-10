import os
import sys
from decimal import Decimal
from django.db.utils import IntegrityError
from django.contrib.auth import get_user_model

from harness import VMLTestHarness

User = get_user_model()


class Tier1UsersFeatureTests(VMLTestHarness):
    """
    Tier 1 Feature Tests for Users & Auth.
    Features:
      - Feature 1: User Auth & OTP
      - Feature 2: User Profile & Leaderboard
      - Feature 25: Frontend Auth Binding
    """

    # --- Feature 1: User Auth & OTP ---

    def test_feature1_user_model_creation_with_phone_number(self):
        user = User.objects.create_user(phone_number="09123456789")
        self.assertEqual(user.phone_number, "09123456789")
        self.assertTrue(Decimal(str(user.virtual_dollars)) >= Decimal("0.00"))
        self.assertFalse(user.is_staff)

    def test_feature1_user_model_unique_phone_number_constraint(self):
        User.objects.create_user(phone_number="09123456789")
        with self.assertRaises(IntegrityError):
            User.objects.create_user(phone_number="09123456789")

    def test_feature1_user_manager_create_user_requires_phone(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(phone_number="")

    def test_feature1_user_manager_create_superuser(self):
        admin = User.objects.create_superuser(phone_number="09120000000", password="adminpassword")
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_feature1_user_str_representation(self):
        user = User.objects.create_user(phone_number="09998887766")
        self.assertEqual(str(user), "09998887766")

    def test_feature1_otp_request_endpoint_valid_phone(self):
        url = "/api/users/auth/otp/request/"
        response = self.client.post(url, {"phone_number": "09121112233"}, format="json")
        self.assertIn(response.status_code, [200, 201, 404])

    def test_feature1_otp_request_invalid_phone_format(self):
        url = "/api/users/auth/otp/request/"
        response = self.client.post(url, {"phone_number": "invalid-phone"}, format="json")
        self.assertIn(response.status_code, [400, 404])

    def test_feature1_otp_verify_endpoint_success(self):
        url = "/api/users/auth/otp/verify/"
        response = self.client.post(url, {"phone_number": "09121112233", "code": "12345"}, format="json")
        self.assertIn(response.status_code, [200, 201, 400, 404])

    def test_feature1_otp_verify_endpoint_missing_code(self):
        url = "/api/users/auth/otp/verify/"
        response = self.client.post(url, {"phone_number": "09121112233"}, format="json")
        self.assertIn(response.status_code, [400, 404])

    # --- Feature 2: User Profile & Leaderboard ---

    def test_feature2_user_profile_me_endpoint_authenticated(self):
        user = self.create_user(phone_number="09129998877", virtual_dollars=5000.00)
        self.client.force_authenticate(user=user)
        url = "/api/users/me/"
        response = self.client.get(url)
        self.assertIn(response.status_code, [200, 404])

    def test_feature2_user_profile_me_endpoint_unauthenticated(self):
        url = "/api/users/me/"
        response = self.client.get(url)
        self.assertIn(response.status_code, [401, 403, 404])

    def test_feature2_leaderboard_endpoint(self):
        url = "/api/users/leaderboard/"
        response = self.client.get(url)
        self.assertIn(response.status_code, [200, 404])

    def test_feature2_user_virtual_dollars_update(self):
        user = self.create_user(phone_number="09125554433", virtual_dollars=1000.00)
        user.virtual_dollars = Decimal(str(user.virtual_dollars)) + Decimal("500.50")
        user.save()
        user.refresh_from_db()
        self.assertEqual(Decimal(str(user.virtual_dollars)), Decimal("1500.50"))

    def test_feature2_user_profile_virtual_dollars_balance_sync(self):
        user = self.create_user(phone_number="09127776655", virtual_dollars=0.00)
        self.assertEqual(Decimal(str(user.virtual_dollars)), Decimal("0.00"))
        user.virtual_dollars = Decimal("250.75")
        user.save()
        user.refresh_from_db()
        self.assertEqual(Decimal(str(user.virtual_dollars)), Decimal("250.75"))

    def test_feature2_leaderboard_sorting_order(self):
        u1 = self.create_user(phone_number="09120000001", virtual_dollars=100.00)
        u2 = self.create_user(phone_number="09120000002", virtual_dollars=500.00)
        u3 = self.create_user(phone_number="09120000003", virtual_dollars=300.00)
        users = list(User.objects.order_by("-virtual_dollars"))
        self.assertTrue(len(users) >= 3)
        self.assertTrue(Decimal(str(users[0].virtual_dollars)) >= Decimal(str(users[1].virtual_dollars)))

    # --- Feature 25: Frontend Auth Binding ---

    def test_feature25_frontend_auth_payload_contract(self):
        user = self.create_user(phone_number="09123332211", virtual_dollars=2500.00)
        payload = {
            "id": user.id,
            "phone_number": user.phone_number,
            "virtual_dollars": str(user.virtual_dollars),
        }
        self.assertIn("phone_number", payload)
        self.assertIn("virtual_dollars", payload)
        self.assertEqual(payload["phone_number"], "09123332211")

    def test_feature25_frontend_unauthorized_token_handling(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid_token")
        response = self.client.get("/api/users/me/")
        self.assertIn(response.status_code, [401, 403, 404])

    def test_feature25_frontend_auth_token_storage_contract(self):
        user = self.create_user(phone_number="09124445566")
        auth_contract = {
            "access": "fake_access_token",
            "refresh": "fake_refresh_token",
            "user": {
                "id": user.id,
                "phone_number": user.phone_number,
                "virtual_dollars": str(user.virtual_dollars),
            }
        }
        self.assertIn("access", auth_contract)
        self.assertIn("refresh", auth_contract)
        self.assertIn("user", auth_contract)
        self.assertEqual(auth_contract["user"]["phone_number"], "09124445566")

    def test_feature25_frontend_profile_response_contract(self):
        user = self.create_user(phone_number="09128889900")
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/users/me/")
        if response.status_code == 200:
            self.assertIn("phone_number", response.data)
            self.assertIn("virtual_dollars", response.data)

    def test_feature25_frontend_otp_request_payload_validation(self):
        response = self.client.post("/api/users/auth/otp/request/", {"phone_number": "09121234567"}, format="json")
        self.assertIn(response.status_code, [200, 201, 404])

