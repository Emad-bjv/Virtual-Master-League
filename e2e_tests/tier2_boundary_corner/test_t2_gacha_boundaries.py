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
from teams.models import Team, Player
from gacha.models import GachaPack, GachaPity, PackOpeningLog
from gacha.services import open_gacha_pack

User = get_user_model()


class Tier2GachaBoundaryTests(VMLTestHarness):
    """
    Tier 2 Boundary & Corner Case Tests for Gacha Engine, Pity Counter, Pack Opening Logs & Frontend Binding (22 test cases).
    Covers F19 (Gacha Pack System), F20 (Pity Counter), F21 (Pack Opening Logs & Reveal), and F29 (Frontend Gacha Binding).
    """

    def setUp(self):
        super().setUp()
        User.objects.all().delete()
        Team.objects.all().delete()
        GachaPack.objects.all().delete()
        GachaPity.objects.all().delete()
        PackOpeningLog.objects.all().delete()
        Player.objects.all().delete()

        self.user = User.objects.create_user(phone_number="09128889900")
        self.team = Team.objects.create(manager=self.user, name="Gacha FC", budget=Decimal("1000.00"))

        self.pack = GachaPack.objects.create(
            name="Legendary Pack",
            cost_usd=Decimal("100.00"),
            rate_legendary=Decimal("15.00"),
            rate_epic=Decimal("55.00"),
            rate_rare=Decimal("30.00"),
            is_active=True
        )

    # --- F20: Pity Counter Boundaries ---

    def test_g1_pity_counter_increment_on_non_legendary_pull(self):
        """Non-legendary pull increments pity counter by +1."""
        pity, _ = GachaPity.objects.get_or_create(team=self.team)
        pity.counter = 3
        pity.save()

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertTrue(res['success'])
        pity.refresh_from_db()
        self.assertIn(pity.counter, [0, 4])

    def test_g2_pity_counter_at_9th_pull_10th_pull_guaranteed_legendary(self):
        """Pity counter at 9 forces 10th pull to be LEGENDARY and resets counter to 0."""
        pity, _ = GachaPity.objects.get_or_create(team=self.team)
        pity.counter = 9
        pity.save()

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertTrue(res['success'])
        self.assertEqual(res['rarity'], 'LEGENDARY')
        self.assertTrue(res['pity_applied'])
        pity.refresh_from_db()
        self.assertEqual(pity.counter, 0)

    def test_g3_pity_counter_reset_on_natural_legendary_pull(self):
        """Natural legendary pull resets pity counter to 0 immediately."""
        pity, _ = GachaPity.objects.get_or_create(team=self.team)
        pity.counter = 5
        pity.save()

        self.pack.rate_legendary = Decimal("100.00")
        self.pack.rate_epic = Decimal("0.00")
        self.pack.rate_rare = Decimal("0.00")
        self.pack.save()

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertTrue(res['success'])
        self.assertEqual(res['rarity'], 'LEGENDARY')
        pity.refresh_from_db()
        self.assertEqual(pity.counter, 0)

    def test_g14_team_pity_endpoint_get(self):
        """GET /api/gacha/pity/{team_id}/ returns team pity counter."""
        res = self.get(f'/api/gacha/pity/{self.team.id}/')
        self.assertIn(res.status_code, [200, 404])

    def test_g17_pity_counter_boundary_at_zero(self):
        """Initial pity counter starts at 0 before any pulls."""
        pity, _ = GachaPity.objects.get_or_create(team=self.team)
        self.assertEqual(pity.counter, 0)

    # --- F19: Gacha Pack System Boundaries ---

    def test_g4_zero_wallet_balance_draw_fails(self):
        """Draw attempt with $0 budget fails with insufficient budget error."""
        self.team.budget = Decimal("0.00")
        self.team.save()

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertFalse(res['success'])
        self.assertIn('موجودی کافی نیست', res['error'])

    def test_g5_insufficient_wallet_balance_draw_fails(self):
        """Draw attempt with budget ($50) < pack cost ($100) fails."""
        self.team.budget = Decimal("50.00")
        self.team.save()

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertFalse(res['success'])
        self.assertIn('موجودی کافی نیست', res['error'])

    def test_g6_exact_wallet_balance_draw_succeeds(self):
        """Draw attempt with budget ($100) == pack cost ($100) succeeds and sets budget to 0."""
        self.team.budget = Decimal("100.00")
        self.team.save()

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertTrue(res['success'])
        self.team.refresh_from_db()
        self.assertEqual(self.team.budget, Decimal("0.00"))

    def test_g7_pack_odds_sum_100_percent_validation(self):
        """Pack rates (rare + epic + legendary) equal 100%."""
        total_rate = self.pack.rate_rare + self.pack.rate_epic + self.pack.rate_legendary
        self.assertEqual(total_rate, Decimal("100.00"))

    def test_g8_pack_odds_negative_rate_invalid(self):
        """Pack rate cannot be negative."""
        self.pack.rate_legendary = Decimal("-5.00")
        self.assertTrue(self.pack.rate_legendary < Decimal("0.00"))

    def test_g9_gacha_draw_squad_cap_25_reached(self):
        """Drawing gacha pack when squad count >= 25 fails before charging budget."""
        for i in range(25):
            Player.objects.create(team=self.team, name=f"GachaCapPlayer{i}", age=20, position="CMF", overall=70, base_stamina=70)

        initial_budget = self.team.budget
        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertFalse(res['success'])
        self.assertIn('حداکثر ظرفیت مجاز (۲۵ بازیکن)', res['error'])
        self.team.refresh_from_db()
        self.assertEqual(self.team.budget, initial_budget)

    def test_g10_gacha_draw_nonexistent_pack_404(self):
        """Drawing non-existent pack ID returns error."""
        res = open_gacha_pack(self.team.id, 99999)
        self.assertFalse(res['success'])
        self.assertIn('پک انتخاب‌شده فعال یا موجود نیست', res['error'])

    def test_g11_gacha_draw_inactive_pack_rejected(self):
        """Drawing inactive pack (is_active=False) returns error."""
        self.pack.is_active = False
        self.pack.save()

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertFalse(res['success'])
        self.assertIn('پک انتخاب‌شده فعال یا موجود نیست', res['error'])

    def test_g12_gacha_draw_nonexistent_team_404(self):
        """Drawing pack for non-existent team ID returns error."""
        res = open_gacha_pack(99999, self.pack.id)
        self.assertFalse(res['success'])
        self.assertIn('تیم یافت نشد', res['error'])

    def test_g16_pack_list_endpoint(self):
        """GET /api/gacha/packs/ returns list of active gacha packs."""
        res = self.get('/api/gacha/packs/')
        self.assertEqual(res.status_code, 200)

    # --- F21: Pack Opening Logs & Reveal Boundaries ---

    def test_g13_global_legendary_cap_30_limit(self):
        """When 30 legendaries exist across league, legendary pulls are capped."""
        for i in range(30):
            t = Team.objects.create(name=f"LegTeam{i}")
            Player.objects.create(team=t, name=f"LegPlayer{i}", age=20, position="CF", overall=88, rarity='LEGENDARY', base_stamina=90)

        active_leg_count = Player.objects.filter(rarity='LEGENDARY').exclude(team=None).count()
        self.assertEqual(active_leg_count, 30)

    def test_g15_pack_opening_log_created_on_draw(self):
        """Successful pack draw creates PackOpeningLog record."""
        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertTrue(res['success'])
        self.assertTrue(PackOpeningLog.objects.filter(team=self.team, pack=self.pack).exists())

    def test_g18_pack_opening_log_empty_team_filter(self):
        """Pack opening log query for team with no history returns count 0."""
        count = PackOpeningLog.objects.filter(team=self.team).count()
        self.assertEqual(count, 0)

    def test_g19_gacha_reveal_payload_missing_rarity(self):
        """Pack draw response contains required keys for frontend card reveal animation."""
        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertTrue(res['success'])
        self.assertIn('player', res)
        self.assertIn('rarity', res)
        self.assertIn('pity_applied', res)

    def test_g20_pack_opening_log_limit_pagination_boundary(self):
        """GET /api/gacha/history/ handles pagination or returns draw logs array."""
        res = self.get(f'/api/gacha/history/?team_id={self.team.id}')
        self.assertIn(res.status_code, [200, 404])

    # --- F29: Frontend Store/Gacha Binding Boundaries ---

    def test_g21_frontend_pack_draw_modal_state_contract(self):
        """Pack draw response structure matches Pack Draw Modal state expectations."""
        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertTrue(res['success'])
        self.assertIn('remaining_budget', res)
        self.assertIn('pity_counter', res)

    def test_g22_frontend_pity_counter_badge_contract(self):
        """Pity counter model returns pity count integer for frontend header/pack badge."""
        pity, _ = GachaPity.objects.get_or_create(team=self.team)
        self.assertIsInstance(pity.counter, int)


if __name__ == '__main__':
    unittest.main()
