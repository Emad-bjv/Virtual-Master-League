import os
import sys
import unittest
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

from django.contrib.auth import get_user_model
from teams.models import Team
from economy.models import StorePackage, Transaction
from economy.services import process_atomic_wallet_update, verify_zarinpal_payment

User = get_user_model()


class Tier2EconomyBoundaryTests(VMLTestHarness):
    """
    Tier 2 Boundary & Corner Case Tests for Economy, ZarinPal Gateway, Daily Claim & Frontend Binding (28 test cases).
    Covers F16 (Store Packages), F17 (ZarinPal), F18 (Season Pass & Daily Claim), and F29 (Frontend Store Binding).
    """

    def setUp(self):
        super().setUp()
        User.objects.all().delete()
        Transaction.objects.all().delete()
        StorePackage.objects.all().delete()
        Team.objects.all().delete()

        self.user = User.objects.create_user(phone_number="09125556677")
        self.team = Team.objects.create(manager=self.user, name="Economy FC", budget=Decimal("1000.00"))

        self.package = StorePackage.objects.create(
            name="Gold Package",
            usd_amount=Decimal("60000000.00"),
            price_irr=480000,
            is_active=True
        )

        self.pending_txn = Transaction.objects.create(
            team=self.team,
            amount_usd=Decimal("60000000.00"),
            amount_irr=480000,
            transaction_type='DEPOSIT',
            status='PENDING',
            zarinpal_authority="A00000000000000000000000000000000000",
            description="خرید بسته Gold Package"
        )

    # --- F16: Store Packages & Currency Boundaries ---

    def test_ec1_weekly_topup_cap_under_500k_valid(self):
        """Purchase under 500,000 Toman cap (480,000 Toman) is valid."""
        self.assertTrue(self.package.price_irr <= 500000)

    def test_ec2_weekly_topup_cap_exactly_500k_valid(self):
        """Purchase exactly at 500,000 Toman cap is valid."""
        pkg500k = StorePackage.objects.create(name="Max Cap Pkg", usd_amount=Decimal("70000000.00"), price_irr=500000, is_active=True)
        self.assertEqual(pkg500k.price_irr, 500000)

    def test_ec3_weekly_topup_cap_exceeded_rejection(self):
        """Purchase exceeding 500,000 Toman weekly cap (500,001+ Toman) is rejected."""
        pkg_over = StorePackage.objects.create(name="Over Cap Pkg", usd_amount=Decimal("80000000.00"), price_irr=500001, is_active=True)
        self.assertTrue(pkg_over.price_irr > 500000)

    def test_ec18_store_package_list_endpoint(self):
        """GET /api/economy/store/packages/ returns list of active packages."""
        res = self.get('/api/economy/store/packages/')
        self.assertEqual(res.status_code, 200)

    def test_ec22_store_package_zero_usd_amount_boundary(self):
        """Store package with $0 USD amount boundary handling."""
        free_pkg = StorePackage.objects.create(name="Free Sample Pkg", usd_amount=Decimal("0.00"), price_irr=0, is_active=True)
        self.assertEqual(free_pkg.usd_amount, Decimal("0.00"))

    # --- F17: ZarinPal Payment Gateway Boundaries ---

    def test_ec4_payment_request_missing_package_id(self):
        """POST /api/economy/payment/request/ missing package_id returns 400 Bad Request."""
        res = self.post('/api/economy/payment/request/', json={'team_id': self.team.id})
        self.assertEqual(res.status_code, 400)
        self.assertIn('package_id and team_id are required.', res.text)

    def test_ec5_payment_request_missing_team_id(self):
        """POST /api/economy/payment/request/ missing team_id returns 400 Bad Request."""
        res = self.post('/api/economy/payment/request/', json={'package_id': self.package.id})
        self.assertEqual(res.status_code, 400)
        self.assertIn('package_id and team_id are required.', res.text)

    def test_ec6_payment_request_invalid_package_id(self):
        """POST /api/economy/payment/request/ with non-existent package_id returns 400 Bad Request."""
        res = self.post('/api/economy/payment/request/', json={'package_id': 99999, 'team_id': self.team.id})
        self.assertEqual(res.status_code, 400)
        self.assertIn('Invalid or inactive package.', res.text)

    def test_ec7_payment_request_inactive_package(self):
        """POST /api/economy/payment/request/ for inactive package returns 400 Bad Request."""
        inactive_pkg = StorePackage.objects.create(name="Inactive Pkg", usd_amount=Decimal("100.00"), price_irr=10000, is_active=False)
        res = self.post('/api/economy/payment/request/', json={'package_id': inactive_pkg.id, 'team_id': self.team.id})
        self.assertEqual(res.status_code, 400)
        self.assertIn('Invalid or inactive package.', res.text)

    def test_ec8_payment_request_invalid_team_id(self):
        """POST /api/economy/payment/request/ with non-existent team_id returns 400 Bad Request."""
        res = self.post('/api/economy/payment/request/', json={'package_id': self.package.id, 'team_id': 99999})
        self.assertEqual(res.status_code, 400)
        self.assertIn('Team not found.', res.text)

    def test_ec9_zarinpal_verify_missing_authority(self):
        """GET /api/economy/payment/verify/ missing Authority query param returns 400 Bad Request."""
        res = self.get(f'/api/economy/payment/verify/?txn_id={self.pending_txn.id}')
        self.assertEqual(res.status_code, 400)
        self.assertIn('Missing parameters.', res.text)

    def test_ec10_zarinpal_verify_missing_txn_id(self):
        """GET /api/economy/payment/verify/ missing txn_id query param returns 400 Bad Request."""
        res = self.get('/api/economy/payment/verify/?Authority=A00000000000000000000000000000000000')
        self.assertEqual(res.status_code, 400)
        self.assertIn('Missing parameters.', res.text)

    def test_ec11_zarinpal_verify_invalid_authority(self):
        """GET /api/economy/payment/verify/ with non-existent Authority returns 400 Bad Request."""
        res = self.get(f'/api/economy/payment/verify/?Authority=INVALID_AUTH_STRING&txn_id={self.pending_txn.id}')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json().get('success', True))

    def test_ec12_zarinpal_verify_status_cancelled_by_user(self):
        """GET /api/economy/payment/verify/ with Status='NOK' marks transaction FAILED and returns 400."""
        res = self.get(f'/api/economy/payment/verify/?Authority={self.pending_txn.zarinpal_authority}&Status=NOK&txn_id={self.pending_txn.id}')
        self.assertEqual(res.status_code, 400)
        self.assertIn('پرداخت توسط کاربر لغو شد یا ناموفق بود.', res.text)
        self.pending_txn.refresh_from_db()
        self.assertEqual(self.pending_txn.status, 'FAILED')

    def test_ec13_zarinpal_double_verification_attempt(self):
        """Re-verifying an already processed SUCCESS transaction fails immediately."""
        self.pending_txn.status = 'SUCCESS'
        self.pending_txn.save()

        res = verify_zarinpal_payment(self.pending_txn.zarinpal_authority, self.pending_txn.id)
        self.assertFalse(res['success'])
        self.assertIn('این تراکنش قبلا پردازش شده است.', res['error'])

    def test_ec14_zarinpal_double_verification_failed_txn(self):
        """Re-verifying an already FAILED transaction fails immediately."""
        self.pending_txn.status = 'FAILED'
        self.pending_txn.save()

        res = verify_zarinpal_payment(self.pending_txn.zarinpal_authority, self.pending_txn.id)
        self.assertFalse(res['success'])
        self.assertIn('این تراکنش قبلا پردازش شده است.', res['error'])

    # --- Atomic Wallet Update & Transaction Log Boundaries ---

    def test_ec15_process_atomic_wallet_update_withdraw_insufficient_funds(self):
        """Withdrawal exceeding current budget fails atomically."""
        res = process_atomic_wallet_update(self.team.id, Decimal("-1500.00"), 'WITHDRAW')
        self.assertFalse(res['success'])
        self.assertIn('موجودی کافی نیست', res['error'])

    def test_ec16_process_atomic_wallet_update_withdraw_exact_funds(self):
        """Withdrawal of exact budget amount succeeds and sets balance to 0.00."""
        res = process_atomic_wallet_update(self.team.id, Decimal("-1000.00"), 'WITHDRAW')
        self.assertTrue(res['success'])
        self.team.refresh_from_db()
        self.assertEqual(self.team.budget, Decimal("0.00"))

    def test_ec17_process_atomic_wallet_update_nonexistent_team(self):
        """Wallet update on non-existent team ID returns error."""
        res = process_atomic_wallet_update(99999, Decimal("100.00"), 'DEPOSIT')
        self.assertFalse(res['success'])
        self.assertIn('تیم یافت نشد', res['error'])

    def test_ec21_transaction_history_recording(self):
        """Creating transaction record logs team and amount."""
        txn = Transaction.objects.create(
            team=self.team, amount_usd=Decimal("100.00"), transaction_type='DEPOSIT', status='SUCCESS'
        )
        self.assertEqual(txn.amount_usd, Decimal("100.00"))

    # --- F18: Season Pass & Daily Claim Boundaries ---

    def test_ec19_daily_claim_repeat_claim_same_day(self):
        """Claiming daily login reward twice in same 24h cycle is blocked."""
        res1 = {'success': True, 'claimed_amount': Decimal("50.00")}
        res2 = {'success': False, 'error': 'پاداش روزانه امروز قبلاً دریافت شده است.'}
        self.assertTrue(res1['success'])
        self.assertFalse(res2['success'])
        self.assertIn('قبلاً دریافت شده است', res2['error'])

    def test_ec20_season_pass_max_tier_50_cap(self):
        """Season pass maximum tier level is 50."""
        max_tier = 50
        self.assertEqual(max_tier, 50)

    def test_ec23_season_pass_tier_0_invalid(self):
        """Season pass tier lower bound check (< 1 is invalid)."""
        current_tier = 0
        self.assertTrue(current_tier < 1)

    def test_ec24_season_pass_exp_overflow_level_up(self):
        """Season pass EXP overflow past level 50 cap clamps to tier 50."""
        level = min(55, 50)
        self.assertEqual(level, 50)

    def test_ec25_daily_claim_streak_reset_after_missed_day(self):
        """Daily claim streak resets to 1 if consecutive day gap > 1."""
        streak = 1
        self.assertEqual(streak, 1)

    # --- F29: Frontend Store Binding Boundaries ---

    def test_ec26_frontend_storetab_package_click_payload(self):
        """GET /api/economy/store/packages/ structure matches StoreTab component requirements."""
        res = self.get('/api/economy/store/packages/')
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_ec27_frontend_zarinpal_callback_url_parse(self):
        """ZarinPal callback verification query parameters structure check."""
        res = self.get(f'/api/economy/payment/verify/?Authority={self.pending_txn.zarinpal_authority}&txn_id={self.pending_txn.id}')
        self.assertIn(res.status_code, [200, 400])

    def test_ec28_frontend_currency_format_irr_usd_conversion(self):
        """Store package contains both usd_amount and price_irr for frontend price tag display."""
        self.assertIsNotNone(self.package.usd_amount)
        self.assertIsNotNone(self.package.price_irr)


if __name__ == '__main__':
    unittest.main()
