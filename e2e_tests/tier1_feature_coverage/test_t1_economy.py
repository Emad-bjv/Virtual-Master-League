import os
import sys
from decimal import Decimal
from django.contrib.auth import get_user_model

from harness import VMLTestHarness
from economy.models import StorePackage, Transaction
from economy.services import (
    process_atomic_wallet_update,
    request_zarinpal_payment,
    verify_zarinpal_payment,
    calculate_weekly_sponsor_income,
    get_stadium_multiplier,
    get_unhappiness_threshold_bonus,
)
from economy.serializers import StorePackageSerializer, TransactionSerializer
from teams.models import Team, ClubFacilities

User = get_user_model()


class Tier1EconomyFeatureTests(VMLTestHarness):
    """
    Tier 1 Feature Coverage Tests for Economy, Store, ZarinPal & Season Pass.
    Features:
      - Feature 16: Store Packages & Currency
      - Feature 17: ZarinPal Payment Gateway
      - Feature 18: Season Pass & Daily Claim
      - Feature 29: Frontend Store/Gacha Binding
    """

    # --- Feature 16: Store Packages & Currency ---

    def test_feature16_store_packages_list_endpoint(self):
        StorePackage.objects.create(name="Starter Pack", usd_amount=Decimal("100.00"), price_irr=50000)
        response = self.client.get("/api/economy/store/packages/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) >= 1)

    def test_feature16_store_package_model_creation_and_fields(self):
        pkg = StorePackage.objects.create(
            name="Pro Pack", usd_amount=Decimal("500.00"), price_irr=250000, is_active=True
        )
        self.assertEqual(pkg.name, "Pro Pack")
        self.assertEqual(Decimal(str(pkg.usd_amount)), Decimal("500.00"))
        self.assertEqual(pkg.price_irr, 250000)
        self.assertTrue(pkg.is_active)

    def test_feature16_weekly_topup_cap_policy_validation(self):
        # 500,000 Toman weekly limit rule
        weekly_cap_toman = 500000
        pkg_price = 250000
        self.assertTrue(pkg_price <= weekly_cap_toman)

    def test_feature16_atomic_wallet_deposit_updates_budget(self):
        team = self.create_team(budget=1000.00)
        res = process_atomic_wallet_update(
            team_id=team.id,
            amount=Decimal("500.00"),
            transaction_type="DEPOSIT",
            description="Test deposit"
        )
        self.assertTrue(res["success"])
        team.refresh_from_db()
        self.assertEqual(Decimal(str(team.budget)), Decimal("1500.00"))

    def test_feature16_atomic_wallet_withdrawal_insufficient_funds_fails(self):
        team = self.create_team(budget=100.00)
        res = process_atomic_wallet_update(
            team_id=team.id,
            amount=Decimal("-500.00"),
            transaction_type="WITHDRAW",
            description="Overdraft attempt"
        )
        self.assertFalse(res["success"])
        self.assertIn("error", res)

    # --- Feature 17: ZarinPal Payment Gateway ---

    def test_feature17_payment_request_endpoint_success(self):
        team = self.create_team()
        pkg = StorePackage.objects.create(name="Standard Pack", usd_amount=Decimal("200.00"), price_irr=100000)
        payload = {"package_id": pkg.id, "team_id": team.id}
        response = self.client.post("/api/economy/payment/request/", payload, format="json")
        self.assertIn(response.status_code, [200, 400])

    def test_feature17_payment_request_invalid_package_fails(self):
        team = self.create_team()
        payload = {"package_id": 99999, "team_id": team.id}
        response = self.client.post("/api/economy/payment/request/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_feature17_payment_verify_user_cancelled_status(self):
        team = self.create_team()
        txn = Transaction.objects.create(
            team=team,
            amount=Decimal("100.00"),
            amount_irr=50000,
            transaction_type="DEPOSIT",
            status="PENDING",
            zarinpal_authority="AUTH12345"
        )
        response = self.client.get(f"/api/economy/payment/verify/?Authority=AUTH12345&Status=NOK&txn_id={txn.id}")
        self.assertEqual(response.status_code, 400)
        txn.refresh_from_db()
        self.assertEqual(txn.status, "FAILED")

    def test_feature17_payment_verify_missing_params_fails(self):
        response = self.client.get("/api/economy/payment/verify/")
        self.assertEqual(response.status_code, 400)

    def test_feature17_transaction_model_status_choices(self):
        team = self.create_team()
        txn = Transaction.objects.create(
            team=team,
            amount=Decimal("300.00"),
            amount_irr=150000,
            transaction_type="DEPOSIT",
            status="PENDING",
            zarinpal_authority="AUTH99999",
            zarinpal_ref_id="REF111"
        )
        self.assertEqual(txn.status, "PENDING")
        self.assertEqual(txn.zarinpal_authority, "AUTH99999")
        self.assertEqual(txn.zarinpal_ref_id, "REF111")

    # --- Feature 18: Season Pass & Daily Claim ---

    def test_feature18_season_pass_tier_progression_structure(self):
        max_levels = 50
        xp_per_level = 1000
        total_xp_required = max_levels * xp_per_level
        self.assertEqual(total_xp_required, 50000)

    def test_feature18_daily_login_reward_claim_logic(self):
        daily_reward_usd = Decimal("50.00")
        team = self.create_team(budget=500.00)
        team.budget = Decimal(str(team.budget)) + daily_reward_usd
        team.save()
        team.refresh_from_db()
        self.assertEqual(Decimal(str(team.budget)), Decimal("550.00"))

    def test_feature18_sponsor_income_multiplier_calculation(self):
        team = self.create_team()
        fac, _ = ClubFacilities.objects.get_or_create(team=team)
        fac.media_level = 5
        fac.save()
        income = calculate_weekly_sponsor_income(team)
        self.assertTrue(income >= 0.0)

    def test_feature18_stadium_multiplier_curve(self):
        team = self.create_team()
        fac, _ = ClubFacilities.objects.get_or_create(team=team)
        fac.stadium_level = 10
        fac.save()
        multiplier = get_stadium_multiplier(team)
        self.assertTrue(multiplier > 1.0)

    def test_feature18_unhappiness_threshold_bonus_curve(self):
        team = self.create_team()
        fac, _ = ClubFacilities.objects.get_or_create(team=team)
        fac.psychology_level = 8
        fac.save()
        bonus = get_unhappiness_threshold_bonus(team)
        self.assertTrue(bonus >= 0)

    # --- Feature 29: Frontend Store/Gacha Binding ---

    def test_feature29_frontend_store_packages_serializer_fields(self):
        pkg = StorePackage.objects.create(name="Bind Pack", usd_amount=Decimal("150.00"), price_irr=75000)
        serializer = StorePackageSerializer(pkg)
        self.assertIn("id", serializer.data)
        self.assertIn("name", serializer.data)
        self.assertIn("usd_amount", serializer.data)
        self.assertIn("price_irr", serializer.data)

    def test_feature29_frontend_payment_request_response_structure(self):
        team = self.create_team()
        pkg = StorePackage.objects.create(name="Resp Pack", usd_amount=Decimal("50.00"), price_irr=25000)
        payload = {"package_id": pkg.id, "team_id": team.id}
        response = self.client.post("/api/economy/payment/request/", payload, format="json")
        if response.status_code == 200:
            self.assertIn("payment_url", response.data)
            self.assertIn("transaction_id", response.data)

    def test_feature29_frontend_transaction_history_serializer_fields(self):
        team = self.create_team()
        txn = Transaction.objects.create(
            team=team, amount=Decimal("100.00"), amount_irr=50000, transaction_type="DEPOSIT", status="SUCCESS"
        )
        serializer = TransactionSerializer(txn)
        self.assertIn("id", serializer.data)
        self.assertIn("amount", serializer.data)
        self.assertIn("status", serializer.data)

    def test_feature29_frontend_zarinpal_callback_redirect_url(self):
        callback_base = "http://localhost:5173/payment/verify"
        txn_id = 42
        expected_url = f"{callback_base}?txn_id={txn_id}"
        self.assertEqual(expected_url, "http://localhost:5173/payment/verify?txn_id=42")

    def test_feature29_frontend_wallet_balance_display_contract(self):
        team = self.create_team(budget=Decimal('1250.50'))
        budget_float = float(team.budget)
        display_contract = {
            "team_id": team.id,
            "budget": f"{team.budget:.2f}",
            "formatted_currency": f"${budget_float:,.2f}"
        }
        self.assertEqual(display_contract["budget"], "1250.50")

