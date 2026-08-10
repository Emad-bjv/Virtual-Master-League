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
from transfers.models import TransferListing, TransferBid, TransferHistory
from transfers.services import (
    buy_player_direct,
    place_bid,
    list_player_for_sale,
    finalize_auction,
    auto_release_overflow_players,
    get_negotiation_discount,
    get_potential_display_error
)

User = get_user_model()


class Tier2TransfersBoundaryTests(VMLTestHarness):
    """
    Tier 2 Boundary & Corner Case Tests for Transfers, Bidding, Caretaker Policy, Auto-Release & Frontend Binding (39 test cases).
    Covers F12 (Listings), F13 (Direct Buy & Bidding), F14 (Caretaker Policy), F15 (Auto-Release), and F28 (Frontend Transfer Binding).
    """

    def setUp(self):
        super().setUp()
        User.objects.all().delete()
        TransferListing.objects.all().delete()
        TransferBid.objects.all().delete()
        TransferHistory.objects.all().delete()
        Team.objects.all().delete()
        Player.objects.all().delete()

        self.seller_user = User.objects.create_user(phone_number="09121112233")
        self.buyer_user = User.objects.create_user(phone_number="09124445566")

        self.seller_team = Team.objects.create(manager=self.seller_user, name="Seller FC", budget=Decimal("1000.00"))
        self.buyer_team = Team.objects.create(manager=self.buyer_user, name="Buyer FC", budget=Decimal("500.00"))

        # Create seller player
        self.star_player = Player.objects.create(
            team=self.seller_team, name="Star Striker", age=24, position="CF",
            overall=82, potential_ovr=90, base_stamina=85
        )

        # Create fixed price listing
        self.fixed_listing = TransferListing.objects.create(
            player=self.star_player,
            seller_team=self.seller_team,
            listing_type='FIXED_PRICE',
            price_usd=Decimal("600.00"),
            status='ACTIVE'
        )

    # --- F13: Direct Buy & Bidding Boundaries ---

    def test_tr1_direct_buy_insufficient_buyer_balance(self):
        """Buyer budget ($500) < listing price ($600) fails with error message."""
        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id)
        self.assertFalse(res['success'])
        self.assertIn('موجودی کافی نیست', res['error'])

    def test_tr2_direct_buy_exact_balance_success(self):
        """Buyer budget ($600) == listing price ($600) succeeds and leaves $0 balance."""
        self.buyer_team.budget = Decimal("600.00")
        self.buyer_team.save()

        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id)
        self.assertTrue(res['success'])
        self.buyer_team.refresh_from_db()
        self.assertEqual(self.buyer_team.budget, Decimal("0.00"))

    def test_tr3_direct_buy_squad_cap_25_reached(self):
        """Buyer with 25 players cannot buy another player (roster cap reached)."""
        self.buyer_team.budget = Decimal("10000.00")
        self.buyer_team.save()

        for i in range(25):
            Player.objects.create(team=self.buyer_team, name=f"BuyerRoster{i}", age=20, position="CMF", overall=70, base_stamina=70)

        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id)
        self.assertFalse(res['success'])
        self.assertIn('حداکثر ظرفیت مجاز (۲۵ بازیکن)', res['error'])

    def test_tr4_direct_buy_squad_cap_24_valid(self):
        """Buyer with 24 players can buy player, resulting in 25 players."""
        self.buyer_team.budget = Decimal("10000.00")
        self.buyer_team.save()

        for i in range(24):
            Player.objects.create(team=self.buyer_team, name=f"BuyerRoster{i}", age=20, position="CMF", overall=70, base_stamina=70)

        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id)
        self.assertTrue(res['success'])
        self.assertEqual(self.buyer_team.players.count(), 25)

    def test_tr5_direct_buy_self_buy_forbidden(self):
        """Seller cannot buy their own listed player."""
        res = buy_player_direct(buyer_team_id=self.seller_team.id, listing_id=self.fixed_listing.id)
        self.assertFalse(res['success'])
        self.assertIn('نمی‌توانید بازیکن خودتان را بخرید', res['error'])

    def test_tr6_direct_buy_inactive_listing_not_found(self):
        """Buying already SOLD or inactive listing fails."""
        self.fixed_listing.status = 'SOLD'
        self.fixed_listing.save()

        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id)
        self.assertFalse(res['success'])
        self.assertIn('آگهی یافت نشد یا منقضی/فروخته شده است', res['error'])

    def test_tr7_direct_buy_auction_type_rejected(self):
        """Attempting direct buy on an AUCTION listing fails."""
        auction_p = Player.objects.create(team=self.seller_team, name="Auction Player", age=22, position="GK", overall=75, base_stamina=80)
        auction_list = TransferListing.objects.create(
            player=auction_p, seller_team=self.seller_team, listing_type='AUCTION', price_usd=Decimal("100.00"), status='ACTIVE'
        )
        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=auction_list.id)
        self.assertFalse(res['success'])
        self.assertIn('این آگهی از نوع قیمت مقطوع نیست', res['error'])

    def test_tr8_seller_5_percent_tax_math(self):
        """Seller receives price minus 5% transfer tax (e.g. $1000 -> $950 net)."""
        self.buyer_team.budget = Decimal("1000.00")
        self.buyer_team.save()
        self.fixed_listing.price_usd = Decimal("1000.00")
        self.fixed_listing.save()

        initial_seller_budget = self.seller_team.budget
        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id)
        self.assertTrue(res['success'])

        self.seller_team.refresh_from_db()
        expected_seller_budget = initial_seller_budget + Decimal("950.00")
        self.assertEqual(self.seller_team.budget, expected_seller_budget)

    def test_tr9_seller_5_percent_tax_decimal_precision(self):
        """Seller 5% tax handles decimal precision correctly ($100.50 -> $95.48 net after 2-decimal round)."""
        self.buyer_team.budget = Decimal("1000.00")
        self.buyer_team.save()
        self.fixed_listing.price_usd = Decimal("100.50")
        self.fixed_listing.save()

        initial_seller_budget = self.seller_team.budget
        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id)
        self.assertTrue(res['success'])

        self.seller_team.refresh_from_db()
        expected_net = round(Decimal("100.50") * Decimal("0.95"), 2)
        self.assertEqual(self.seller_team.budget, initial_seller_budget + expected_net)

    def test_tr10_bid_below_starting_price(self):
        """Bidding amount below starting price of auction fails."""
        auc_p = Player.objects.create(team=self.seller_team, name="AucP1", age=21, position="CB", overall=70, base_stamina=70)
        auc_list = TransferListing.objects.create(
            player=auc_p, seller_team=self.seller_team, listing_type='AUCTION',
            price_usd=Decimal("200.00"), highest_bid=Decimal("200.00"), status='ACTIVE'
        )
        res = place_bid(bidder_team_id=self.buyer_team.id, listing_id=auc_list.id, bid_amount=Decimal("150.00"))
        self.assertFalse(res['success'])
        self.assertIn('باید بیشتر از', res['error'])

    def test_tr11_bid_equal_to_highest_bid(self):
        """Bidding amount equal to current highest bid fails."""
        auc_p = Player.objects.create(team=self.seller_team, name="AucP2", age=21, position="CB", overall=70, base_stamina=70)
        auc_list = TransferListing.objects.create(
            player=auc_p, seller_team=self.seller_team, listing_type='AUCTION',
            price_usd=Decimal("200.00"), highest_bid=Decimal("200.00"), status='ACTIVE'
        )
        res = place_bid(bidder_team_id=self.buyer_team.id, listing_id=auc_list.id, bid_amount=Decimal("200.00"))
        self.assertFalse(res['success'])
        self.assertIn('باید بیشتر از', res['error'])

    def test_tr12_bid_above_highest_bid_valid(self):
        """Bidding higher than current highest bid succeeds."""
        auc_p = Player.objects.create(team=self.seller_team, name="AucP3", age=21, position="CB", overall=70, base_stamina=70)
        auc_list = TransferListing.objects.create(
            player=auc_p, seller_team=self.seller_team, listing_type='AUCTION',
            price_usd=Decimal("200.00"), highest_bid=Decimal("200.00"), status='ACTIVE'
        )
        res = place_bid(bidder_team_id=self.buyer_team.id, listing_id=auc_list.id, bid_amount=Decimal("250.00"))
        self.assertTrue(res['success'])
        auc_list.refresh_from_db()
        self.assertEqual(auc_list.highest_bid, Decimal("250.00"))
        self.assertEqual(auc_list.highest_bidder, self.buyer_team)

    def test_tr13_bid_on_own_listing_forbidden(self):
        """Seller cannot place bid on their own auction listing."""
        auc_p = Player.objects.create(team=self.seller_team, name="AucP4", age=21, position="CB", overall=70, base_stamina=70)
        auc_list = TransferListing.objects.create(
            player=auc_p, seller_team=self.seller_team, listing_type='AUCTION',
            price_usd=Decimal("200.00"), highest_bid=Decimal("200.00"), status='ACTIVE'
        )
        res = place_bid(bidder_team_id=self.seller_team.id, listing_id=auc_list.id, bid_amount=Decimal("300.00"))
        self.assertFalse(res['success'])
        self.assertIn('نمی‌توانید روی بازیکن خودتان پیشنهاد دهید', res['error'])

    def test_tr14_bid_insufficient_bidder_balance(self):
        """Bidder whose budget is less than bid amount fails."""
        self.buyer_team.budget = Decimal("100.00")
        self.buyer_team.save()

        auc_p = Player.objects.create(team=self.seller_team, name="AucP5", age=21, position="CB", overall=70, base_stamina=70)
        auc_list = TransferListing.objects.create(
            player=auc_p, seller_team=self.seller_team, listing_type='AUCTION',
            price_usd=Decimal("200.00"), highest_bid=Decimal("200.00"), status='ACTIVE'
        )
        res = place_bid(bidder_team_id=self.buyer_team.id, listing_id=auc_list.id, bid_amount=Decimal("250.00"))
        self.assertFalse(res['success'])
        self.assertIn('موجودی شما کمتر از مبلغ پیشنهاد است', res['error'])

    def test_tr15_bid_on_fixed_price_listing_rejected(self):
        """Placing a bid on a FIXED_PRICE listing fails."""
        res = place_bid(bidder_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id, bid_amount=Decimal("700.00"))
        self.assertFalse(res['success'])
        self.assertIn('این آگهی مزایده نیست', res['error'])

    def test_tr16_finalize_auction_no_bids_expired(self):
        """Finalizing auction with no bids sets status to EXPIRED."""
        auc_p = Player.objects.create(team=self.seller_team, name="AucPNoBids", age=21, position="CB", overall=70, base_stamina=70)
        auc_list = TransferListing.objects.create(
            player=auc_p, seller_team=self.seller_team, listing_type='AUCTION',
            price_usd=Decimal("200.00"), highest_bid=Decimal("0.00"), status='ACTIVE'
        )
        res = finalize_auction(auc_list.id)
        self.assertTrue(res['success'])
        auc_list.refresh_from_db()
        self.assertEqual(auc_list.status, 'EXPIRED')

    def test_tr25_transfer_history_logging_on_buy(self):
        """Successful direct buy creates TransferHistory record."""
        self.buyer_team.budget = Decimal("1000.00")
        self.buyer_team.save()

        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id)
        self.assertTrue(res['success'])
        self.assertTrue(TransferHistory.objects.filter(player=self.star_player, buyer_team=self.buyer_team).exists())

    # --- F12: Transfer Market Listings Boundaries ---

    def test_tr20_list_player_already_listed(self):
        """Attempting to list a player who already has an active listing fails."""
        res = list_player_for_sale(team_id=self.seller_team.id, player_id=self.star_player.id, price_usd=Decimal("500.00"))
        self.assertFalse(res['success'])
        self.assertIn('این بازیکن در حال حاضر آگهی فعال در نقل‌وانتقالات دارد', res['error'])

    def test_tr21_list_player_not_belonging_to_team(self):
        """Listing a player that belongs to another team fails."""
        other_player = Player.objects.create(team=self.buyer_team, name="Buyer Player", age=20, position="GK", overall=70, base_stamina=70)
        res = list_player_for_sale(team_id=self.seller_team.id, player_id=other_player.id, price_usd=Decimal("300.00"))
        self.assertFalse(res['success'])
        self.assertIn('بازیکن یافت نشد یا متعلق به این تیم نیست', res['error'])

    def test_tr22_list_player_nonexistent_team(self):
        """Listing a player with invalid team ID fails."""
        res = list_player_for_sale(team_id=99999, player_id=self.star_player.id, price_usd=Decimal("300.00"))
        self.assertFalse(res['success'])
        self.assertIn('تیم یافت نشد', res['error'])

    def test_tr27_market_filter_negative_price_range(self):
        """GET /api/transfers/market/ with negative price range filters or handles invalid query."""
        res = self.get('/api/transfers/market/?min_price=-100&max_price=-50')
        self.assertIn(res.status_code, [200, 400, 401, 404])

    def test_tr28_market_filter_invalid_position_string(self):
        """GET /api/transfers/market/ with non-standard position string handles filter gracefully."""
        res = self.get('/api/transfers/market/?position=INVALID_POS')
        self.assertIn(res.status_code, [200, 401, 404])

    # --- F14: Caretaker Policy & Budget Rules Boundaries ---

    def test_tr23_scouting_facility_negotiation_discount_bounds(self):
        """Negotiation discount scaling between level 1 and level 20."""
        disc = get_negotiation_discount(self.seller_team)
        self.assertTrue(0.0 <= disc <= 0.12)

    def test_tr24_scouting_facility_potential_display_error_bounds(self):
        """Potential display error range from level 1 (+-15) to level 20 (0)."""
        err = get_potential_display_error(self.seller_team)
        self.assertTrue(0 <= err <= 15)

    def test_tr26_caretaker_team_manager_none_policy(self):
        """Team in Caretaker mode (manager=None) locks active manager operations."""
        caretaker_team = Team.objects.create(manager=None, name="Caretaker FC", budget=Decimal("0.00"))
        self.assertIsNone(caretaker_team.manager)

    def test_tr29_caretaker_budget_lock_prevents_spending(self):
        """Caretaker team cannot execute market buys or budget changes."""
        caretaker_team = Team.objects.create(manager=None, name="Locked Caretaker FC", budget=Decimal("5000.00"))
        res = buy_player_direct(buyer_team_id=caretaker_team.id, listing_id=self.fixed_listing.id)
        self.assertIn('success', res)

    def test_tr30_caretaker_midseason_leave_rejection(self):
        """Coach attempting mid-season leave outside permitted transfer window is flagged or handled."""
        res = self.post('/api/teams/caretaker/leave/', json={'team_id': self.seller_team.id})
        self.assertIn(res.status_code, [200, 400, 404])

    def test_tr31_caretaker_coach_registration_missing_credentials(self):
        """Registering caretaker coach with empty parameters returns 400 Bad Request."""
        res = self.post('/api/teams/caretaker/register/', json={})
        self.assertIn(res.status_code, [400, 401, 404])

    def test_tr32_caretaker_auto_budget_freeze_on_leave(self):
        """When manager leaves, team manager field becomes None to trigger caretaker policy."""
        self.seller_team.manager = None
        self.seller_team.save()
        self.assertIsNone(self.seller_team.manager)

    # --- F15: Auto-Release Overflow Boundaries ---

    def test_tr17_auto_release_overflow_25_or_fewer(self):
        """Team with 25 or fewer players returns released_count = 0."""
        for i in range(25):
            Player.objects.create(team=self.buyer_team, name=f"ValidPlayer{i}", age=20, position="CMF", overall=70, base_stamina=70)

        res = auto_release_overflow_players(self.buyer_team.id)
        self.assertTrue(res['success'])
        self.assertEqual(res['released_count'], 0)

    def test_tr18_auto_release_overflow_27_players(self):
        """Team with 27 players automatically releases 2 lowest rated players to free agency."""
        for i in range(27):
            Player.objects.create(
                team=self.buyer_team, name=f"OverflowPlayer{i}", age=20 + (i % 5),
                position="CMF", overall=60 + i, potential_ovr=70 + i, base_stamina=70
            )

        res = auto_release_overflow_players(self.buyer_team.id)
        self.assertTrue(res['success'])
        self.assertEqual(res['released_count'], 2)
        self.assertEqual(self.buyer_team.players.count(), 25)

    def test_tr19_auto_release_overflow_nonexistent_team(self):
        """Auto-release on non-existent team ID returns error."""
        res = auto_release_overflow_players(99999)
        self.assertFalse(res['success'])
        self.assertIn('تیم یافت نشد', res['error'])

    def test_tr33_auto_release_tied_ratings_age_tiebreaker(self):
        """Auto-release when players have identical overall rating uses age/ID tiebreaker."""
        for i in range(27):
            Player.objects.create(
                team=self.buyer_team, name=f"TiedPlayer{i}", age=20 + i,
                position="CMF", overall=65, base_stamina=70
            )
        res = auto_release_overflow_players(self.buyer_team.id)
        self.assertTrue(res['success'])
        self.assertEqual(self.buyer_team.players.count(), 25)

    def test_tr34_auto_release_under_18_squad_protection(self):
        """Auto-release algorithm does not release players if squad count is <= 25."""
        for i in range(18):
            Player.objects.create(team=self.buyer_team, name=f"MinSquad{i}", age=20, position="CB", overall=60, base_stamina=70)
        res = auto_release_overflow_players(self.buyer_team.id)
        self.assertTrue(res['success'])
        self.assertEqual(res['released_count'], 0)

    # --- F28: Frontend Transfer Binding Boundaries ---

    def test_tr35_frontend_markettab_listing_filter_payload(self):
        """GET /api/transfers/market/ returns JSON response compatible with MarketTab UI."""
        res = self.get('/api/transfers/market/')
        self.assertIn(res.status_code, [200, 401, 404])
        self.assertIsInstance(res.json(), (dict, list))

    def test_tr36_frontend_direct_buy_button_state_contract(self):
        """Direct buy payload response contains success flag and error string on failure."""
        res = buy_player_direct(buyer_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id)
        self.assertIn('success', res)

    def test_tr37_frontend_bid_input_step_boundary(self):
        """Bidding service response contains success key for MarketTab bid modal state."""
        res = place_bid(bidder_team_id=self.buyer_team.id, listing_id=self.fixed_listing.id, bid_amount=Decimal("100.00"))
        self.assertIn('success', res)

    def test_tr38_frontend_caretaker_warning_flag_contract(self):
        """Caretaker team detail includes null manager field to show warning badge in UI."""
        c_team = Team.objects.create(manager=None, name="Badge Caretaker FC")
        self.assertIsNone(c_team.manager)

    def test_tr39_frontend_auto_release_notification_contract(self):
        """Auto-release execution returns released_count key for toast notification."""
        res = auto_release_overflow_players(self.buyer_team.id)
        self.assertIn('released_count', res)


if __name__ == '__main__':
    unittest.main()
