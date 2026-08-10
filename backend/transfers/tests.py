from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from teams.models import Team, Player
from transfers.models import TransferListing, TransferBid, TransferHistory
from transfers.services import (
    list_player_for_sale,
    buy_player_direct,
    place_bid,
    finalize_auction,
    auto_release_overflow_players
)

User = get_user_model()


class TransferMarketTestCase(TestCase):
    def setUp(self):
        # Teams get managers: the caretaker policy blocks managerless teams from
        # spending budget (buying/bidding), matching the e2e Feature 14 rules.
        self.seller_manager = User.objects.create_user(phone_number="09120000001")
        self.buyer_manager = User.objects.create_user(phone_number="09120000002")
        self.seller = Team.objects.create(name="Seller FC", manager=self.seller_manager, budget=Decimal('500.00'))
        self.buyer = Team.objects.create(name="Buyer FC", manager=self.buyer_manager, budget=Decimal('1000.00'))
        self.player = Player.objects.create(
            team=self.seller,
            name="Star Player",
            age=24,
            position='CF',
            overall=88,
            base_stamina=90
        )

    def test_list_player_for_sale(self):
        res = list_player_for_sale(self.seller.id, self.player.id, Decimal('200.00'), 'FIXED_PRICE')
        self.assertTrue(res['success'])
        self.assertEqual(TransferListing.objects.count(), 1)
        listing = TransferListing.objects.first()
        self.assertEqual(listing.price_usd, Decimal('200.00'))
        self.assertEqual(listing.status, 'ACTIVE')

    def test_buy_player_direct_success(self):
        list_res = list_player_for_sale(self.seller.id, self.player.id, Decimal('200.00'), 'FIXED_PRICE')
        listing_id = list_res['listing_id']

        buy_res = buy_player_direct(self.buyer.id, listing_id)
        self.assertTrue(buy_res['success'])

        self.player.refresh_from_db()
        self.buyer.refresh_from_db()
        self.seller.refresh_from_db()

        self.assertEqual(self.player.team, self.buyer)
        self.assertEqual(self.buyer.budget, Decimal('800.00')) # 1000 - 200
        # 500 + 200 * 0.95 = 690
        self.assertEqual(self.seller.budget, Decimal('690.00'))
        self.assertEqual(TransferHistory.objects.count(), 1)

    def test_auction_bidding_and_finalization(self):
        list_res = list_player_for_sale(self.seller.id, self.player.id, Decimal('300.00'), 'AUCTION')
        listing_id = list_res['listing_id']

        # Place bid
        bid_res = place_bid(self.buyer.id, listing_id, Decimal('350.00'))
        self.assertTrue(bid_res['success'])
        self.assertEqual(bid_res['highest_bid'], Decimal('350.00'))

        # Finalize auction
        fin_res = finalize_auction(listing_id)
        self.assertTrue(fin_res['success'])

        self.player.refresh_from_db()
        self.assertEqual(self.player.team, self.buyer)

    def test_auto_release_overflow_players(self):
        # Create 27 players for seller
        for i in range(26):
            Player.objects.create(
                team=self.seller,
                name=f"Sub {i}",
                age=20,
                position='CMF',
                overall=60 + i, # varying overall
                base_stamina=70
            )

        self.assertEqual(self.seller.players.count(), 27)

        rel_res = auto_release_overflow_players(self.seller.id)
        self.assertTrue(rel_res['success'])
        self.assertEqual(rel_res['released_count'], 2)
        self.assertEqual(self.seller.players.count(), 25)
