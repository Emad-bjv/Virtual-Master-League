from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from teams.models import Team, Player
from transfers.models import TransferListing, TransferBid, TransferHistory, TransferOffer, TransferLog
from transfers.services import (
    list_player_for_sale,
    buy_player_direct,
    place_bid,
    finalize_auction,
    auto_release_overflow_players
)
from transfers.negotiation_services import (
    create_transfer_offer,
    accept_transfer_offer,
    reject_transfer_offer,
    release_player
)
from transfers.serializers import TransferOfferSerializer

User = get_user_model()


class TransferMarketTestCase(TestCase):
    def setUp(self):
        self.seller_manager = User.objects.create_user(username="seller_coach", password="password123")
        self.buyer_manager = User.objects.create_user(username="buyer_coach", password="password123")
        self.seller = Team.objects.create(name="Seller FC", manager=self.seller_manager, budget=Decimal('500.00'))
        self.buyer = Team.objects.create(name="Buyer FC", manager=self.buyer_manager, budget=Decimal('1000.00'))
        self.player = Player.objects.create(
            team=self.seller,
            name="Star Player",
            age=24,
            position='CF',
            overall=88,
            wage=Decimal('10.00'),
            market_value=Decimal('500.00'),
            base_stamina=90
        )
        self.client = APIClient()

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

    def test_create_and_accept_negotiation_offer_with_tax(self):
        # 1. Create negotiation offer
        data = {
            'offer_type': 'DIRECT_TRANSFER',
            'cash_amount': 400.00,
        }
        res = create_transfer_offer(
            sender_team_id=self.buyer.id,
            receiver_team_id=self.seller.id,
            target_player_id=self.player.id,
            data=data
        )
        self.assertTrue(res['success'])
        offer_id = res['offer_id']
        offer = TransferOffer.objects.get(id=offer_id)
        self.assertEqual(offer.status, 'PENDING')

        # 2. Accept offer (seller accepts)
        accept_res = accept_transfer_offer(offer_id, self.seller.id)
        self.assertTrue(accept_res['success'])

        self.player.refresh_from_db()
        self.buyer.refresh_from_db()
        self.seller.refresh_from_db()

        self.assertEqual(self.player.team, self.buyer)
        self.assertEqual(self.buyer.budget, Decimal('600.00')) # 1000 - 400
        # 500 + 400 * 0.95 = 500 + 380 = 880
        self.assertEqual(self.seller.budget, Decimal('880.00'))

        # Check TransferHistory recorded
        self.assertTrue(TransferHistory.objects.filter(player=self.player, transfer_type='DIRECT_TRANSFER').exists())

    def test_reject_and_cancel_transfer_offer(self):
        data = {'offer_type': 'DIRECT_TRANSFER', 'cash_amount': 100.00}
        res = create_transfer_offer(self.buyer.id, self.seller.id, self.player.id, data)
        offer_id = res['offer_id']

        # Seller rejects
        rej_res = reject_transfer_offer(offer_id, self.seller.id)
        self.assertTrue(rej_res['success'])
        self.assertEqual(rej_res['status'], 'REJECTED')
        self.assertTrue(TransferLog.objects.filter(event_type='OFFER_REJECTED').exists())

        # Sender cancels new offer
        res2 = create_transfer_offer(self.buyer.id, self.seller.id, self.player.id, data)
        offer_id2 = res2['offer_id']
        can_res = reject_transfer_offer(offer_id2, self.buyer.id)
        self.assertTrue(can_res['success'])
        self.assertEqual(can_res['status'], 'CANCELLED')
        self.assertTrue(TransferLog.objects.filter(event_type='OFFER_CANCELLED').exists())

    def test_release_player_and_sign_free_agent(self):
        # Release player
        rel_res = release_player(self.player.id, self.seller.id)
        self.assertTrue(rel_res['success'])
        self.player.refresh_from_db()
        self.assertIsNone(self.player.team)
        self.assertTrue(TransferHistory.objects.filter(player=self.player, transfer_type='RELEASE').exists())

        # Sign free agent via API
        self.client.force_authenticate(user=self.buyer_manager)
        response = self.client.post(f'/api/transfers/free-agents/{self.player.id}/sign/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.player.refresh_from_db()
        self.assertEqual(self.player.team, self.buyer)
        self.assertTrue(TransferHistory.objects.filter(player=self.player, transfer_type='FREE_AGENT').exists())

    def test_transfer_views_and_serializer(self):
        # Test serializer
        offer = TransferOffer.objects.create(
            sender_team=self.buyer,
            receiver_team=self.seller,
            target_player=self.player,
            offer_type='DIRECT_TRANSFER',
            cash_amount=Decimal('200.00'),
            status='PENDING'
        )
        serializer = TransferOfferSerializer(offer)
        self.assertEqual(serializer.data['target_player_name'], self.player.name)
        self.assertEqual(serializer.data['sender_team_name'], self.buyer.name)

        # Test market list view
        self.client.force_authenticate(user=self.buyer_manager)
        market_res = self.client.get('/api/transfers/market/')
        self.assertEqual(market_res.status_code, status.HTTP_200_OK)

        # Test inbox view
        inbox_res = self.client.get('/api/transfers/inbox/')
        self.assertEqual(inbox_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(inbox_res.data), 1)

        # Test create offer view via API
        post_data = {
            'receiver_team_id': self.seller.id,
            'target_player_id': self.player.id,
            'offer_type': 'DIRECT_TRANSFER',
            'cash_amount': 250.00
        }
        create_res = self.client.post('/api/transfers/offers/', post_data, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
