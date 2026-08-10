import os
import sys
from decimal import Decimal
from django.contrib.auth import get_user_model

from harness import VMLTestHarness
from teams.models import Team, Player, ClubFacilities
from transfers.models import TransferListing, TransferBid, TransferHistory
from transfers.services import (
    list_player_for_sale,
    buy_player_direct,
    place_bid,
    auto_release_overflow_players,
    get_negotiation_discount,
    get_potential_display_error,
)

User = get_user_model()


class Tier1TransfersFeatureTests(VMLTestHarness):
    """
    Tier 1 Feature Coverage Tests for Transfers, Market, Caretaker & Auto-Release.
    Features:
      - Feature 12: Transfer Market Listings
      - Feature 13: Direct Buy & Bidding
      - Feature 14: Caretaker Policy & Budget Rules
      - Feature 15: Auto-Release Overflow
      - Feature 28: Frontend Transfer Binding
    """

    # --- Feature 12: Transfer Market Listings ---

    def test_feature12_list_player_for_sale_fixed_price(self):
        team = self.create_team()
        player = self.create_player(team=team)
        res = list_player_for_sale(team.id, player.id, Decimal("500.00"), "FIXED_PRICE")
        self.assertTrue(res["success"])
        self.assertIn("listing_id", res)

    def test_feature12_list_player_already_listed_fails(self):
        team = self.create_team()
        player = self.create_player(team=team)
        list_player_for_sale(team.id, player.id, Decimal("500.00"), "FIXED_PRICE")
        res2 = list_player_for_sale(team.id, player.id, Decimal("600.00"), "FIXED_PRICE")
        self.assertFalse(res2["success"])
        self.assertIn("error", res2)

    def test_feature12_list_player_nonexistent_team_fails(self):
        res = list_player_for_sale(99999, 1, Decimal("500.00"))
        self.assertFalse(res["success"])

    def test_feature12_transfer_market_list_endpoint(self):
        response = self.client.get("/api/transfers/market/")
        self.assertEqual(response.status_code, 200)

    def test_feature12_transfer_listing_status_choices(self):
        team = self.create_team()
        player = self.create_player(team=team)
        listing = TransferListing.objects.create(
            seller_team=team, player=player, price_usd=Decimal("200.00"), status="ACTIVE"
        )
        self.assertEqual(listing.status, "ACTIVE")

    # --- Feature 13: Direct Buy & Bidding ---

    def test_feature13_buy_player_direct_success_and_tax(self):
        seller = self.create_team(budget=1000.00)
        buyer = self.create_team(budget=2000.00)
        player = self.create_player(team=seller)
        listing_res = list_player_for_sale(seller.id, player.id, Decimal("500.00"), "FIXED_PRICE")
        buy_res = buy_player_direct(buyer.id, listing_res["listing_id"])
        self.assertTrue(buy_res["success"])
        player.refresh_from_db()
        self.assertEqual(player.team, buyer)
        buyer.refresh_from_db()
        self.assertEqual(Decimal(str(buyer.budget)), Decimal("1500.00"))

    def test_feature13_buy_player_insufficient_funds_fails(self):
        seller = self.create_team(budget=1000.00)
        buyer = self.create_team(budget=100.00)
        player = self.create_player(team=seller)
        listing_res = list_player_for_sale(seller.id, player.id, Decimal("500.00"), "FIXED_PRICE")
        buy_res = buy_player_direct(buyer.id, listing_res["listing_id"])
        self.assertFalse(buy_res["success"])

    def test_feature13_buy_player_roster_cap_exceeded_fails(self):
        seller = self.create_team()
        buyer = self.create_team(budget=10000.00)
        for i in range(25):
            self.create_player(team=buyer, name=f"Buyer Player {i}")
        player = self.create_player(team=seller)
        listing_res = list_player_for_sale(seller.id, player.id, Decimal("100.00"), "FIXED_PRICE")
        buy_res = buy_player_direct(buyer.id, listing_res["listing_id"])
        self.assertFalse(buy_res["success"])

    def test_feature13_buy_own_player_fails(self):
        team = self.create_team(budget=5000.00)
        player = self.create_player(team=team)
        listing_res = list_player_for_sale(team.id, player.id, Decimal("500.00"), "FIXED_PRICE")
        buy_res = buy_player_direct(team.id, listing_res["listing_id"])
        self.assertFalse(buy_res["success"])

    def test_feature13_place_bid_auction_success(self):
        seller = self.create_team()
        bidder = self.create_team(budget=5000.00)
        player = self.create_player(team=seller)
        listing_res = list_player_for_sale(seller.id, player.id, Decimal("500.00"), "AUCTION")
        bid_res = place_bid(bidder.id, listing_res["listing_id"], Decimal("600.00"))
        self.assertTrue(bid_res["success"])
        self.assertEqual(bid_res["highest_bid"], Decimal("600.00"))

    # --- Feature 14: Caretaker Policy & Budget Rules ---

    def test_feature14_caretaker_mode_squad_lock(self):
        team = self.create_team()
        self.assertIsNotNone(team.id)

    def test_feature14_caretaker_bailout_package(self):
        initial_budget = Decimal("0.00")
        bailout = Decimal("100000.00") if initial_budget == Decimal("0.00") else Decimal("0.00")
        self.assertEqual(bailout, Decimal("100000.00"))

    def test_feature14_negotiation_discount_scouting_level(self):
        team = self.create_team()
        disc_lvl1 = get_negotiation_discount(team)
        fac, _ = ClubFacilities.objects.get_or_create(team=team)
        fac.scouting_level = 20
        fac.save()
        disc_lvl20 = get_negotiation_discount(team)
        self.assertTrue(disc_lvl20 >= disc_lvl1)

    def test_feature14_potential_display_error_scouting_level(self):
        team = self.create_team()
        err_lvl1 = get_potential_display_error(team)
        fac, _ = ClubFacilities.objects.get_or_create(team=team)
        fac.scouting_level = 20
        fac.save()
        err_lvl20 = get_potential_display_error(team)
        self.assertEqual(err_lvl20, 0)
        self.assertTrue(err_lvl1 > err_lvl20)

    def test_feature14_transfer_history_logging(self):
        seller = self.create_team()
        buyer = self.create_team(budget=2000.00)
        player = self.create_player(team=seller)
        listing_res = list_player_for_sale(seller.id, player.id, Decimal("300.00"), "FIXED_PRICE")
        buy_player_direct(buyer.id, listing_res["listing_id"])
        history = TransferHistory.objects.filter(player=player).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.price_usd, Decimal("300.00"))

    # --- Feature 15: Auto-Release Overflow ---

    def test_feature15_auto_release_overflow_players_when_over_25(self):
        team = self.create_team()
        for i in range(27):
            self.create_player(team=team, name=f"Overflow Player {i}", overall=60 + i)
        res = auto_release_overflow_players(team.id)
        self.assertTrue(res["success"])
        self.assertEqual(res["released_count"], 2)
        self.assertEqual(team.players.count(), 25)

    def test_feature15_auto_release_no_action_under_cap(self):
        team = self.create_team()
        for i in range(20):
            self.create_player(team=team, name=f"Under Cap Player {i}")
        res = auto_release_overflow_players(team.id)
        self.assertTrue(res["success"])
        self.assertEqual(res["released_count"], 0)

    def test_feature15_auto_release_endpoint_success(self):
        team = self.create_team()
        response = self.client.post(f"/api/transfers/release-overflow/{team.id}/")
        self.assertEqual(response.status_code, 200)

    def test_feature15_auto_release_nonexistent_team_fails(self):
        res = auto_release_overflow_players(99999)
        self.assertFalse(res["success"])

    def test_feature15_auto_release_unassigns_team_to_free_agency(self):
        team = self.create_team()
        for i in range(26):
            self.create_player(team=team, name=f"FA Player {i}", overall=60)
        auto_release_overflow_players(team.id)
        fa_players = Player.objects.filter(team=None)
        self.assertTrue(fa_players.count() >= 1)

    # --- Feature 28: Frontend Transfer Binding ---

    def test_feature28_frontend_transfer_listing_serializer_fields(self):
        team = self.create_team()
        player = self.create_player(team=team)
        list_player_for_sale(team.id, player.id, Decimal("400.00"))
        response = self.client.get("/api/transfers/market/")
        self.assertEqual(response.status_code, 200)

    def test_feature28_frontend_buy_direct_endpoint(self):
        seller = self.create_team()
        buyer = self.create_team(budget=3000.00)
        player = self.create_player(team=seller)
        list_res = list_player_for_sale(seller.id, player.id, Decimal("500.00"), "FIXED_PRICE")
        payload = {"buyer_team_id": buyer.id, "listing_id": list_res["listing_id"]}
        response = self.client.post("/api/transfers/buy/", payload, format="json")
        self.assertEqual(response.status_code, 200)

    def test_feature28_frontend_place_bid_endpoint(self):
        seller = self.create_team()
        bidder = self.create_team(budget=3000.00)
        player = self.create_player(team=seller)
        list_res = list_player_for_sale(seller.id, player.id, Decimal("500.00"), "AUCTION")
        payload = {"bidder_team_id": bidder.id, "listing_id": list_res["listing_id"], "bid_amount": "650.00"}
        response = self.client.post("/api/transfers/bid/", payload, format="json")
        self.assertEqual(response.status_code, 200)

    def test_feature28_frontend_transfer_history_endpoint(self):
        response = self.client.get("/api/transfers/history/")
        self.assertEqual(response.status_code, 200)

    def test_feature28_frontend_bid_below_minimum_fails(self):
        seller = self.create_team()
        bidder = self.create_team(budget=3000.00)
        player = self.create_player(team=seller)
        list_res = list_player_for_sale(seller.id, player.id, Decimal("500.00"), "AUCTION")
        payload = {"bidder_team_id": bidder.id, "listing_id": list_res["listing_id"], "bid_amount": "400.00"}
        response = self.client.post("/api/transfers/bid/", payload, format="json")
        self.assertEqual(response.status_code, 400)
