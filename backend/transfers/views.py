from decimal import Decimal
from rest_framework import generics, status, views
from rest_framework.response import Response
from .serializers import TransferListingSerializer, TransferHistorySerializer, LeagueTeamSerializer, TransferOfferSerializer, TransferLogSerializer
from teams.models import Team, Player
from django.db.models import Q
from .models import TransferListing, TransferHistory, TransferOffer, TransferLog
from .negotiation_services import create_transfer_offer, accept_transfer_offer, reject_transfer_offer, release_player
from .services import (
    list_player_for_sale,
    buy_player_direct,
    place_bid,
    finalize_auction,
    auto_release_overflow_players
)


class TransferMarketListView(generics.ListAPIView):
    """
    Returns active listings in the transfer market.
    Can be filtered by position or min/max price via query params.
    """
    serializer_class = TransferListingSerializer

    def get_queryset(self):
        queryset = TransferListing.objects.filter(status='ACTIVE')
        position = self.request.query_params.get('position')
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')

        if position:
            queryset = queryset.filter(player__position=position)
        if min_price:
            queryset = queryset.filter(price_usd__gte=min_price)
        if max_price:
            queryset = queryset.filter(price_usd__lte=max_price)

        return queryset


class CreateListingView(views.APIView):
    """
    Lists a player for sale (fixed price or auction).
    """
    def post(self, request):
        if not hasattr(request.user, 'team') or request.user.team is None:
            return Response({'error': 'You must have a team to list players.'}, status=status.HTTP_403_FORBIDDEN)
        team_id = request.user.team.id
        player_id = request.data.get('player_id')
        price_usd = request.data.get('price_usd')
        listing_type = request.data.get('listing_type', 'FIXED_PRICE')

        if not player_id or not price_usd:
            return Response({'error': 'player_id and price_usd are required.'}, status=status.HTTP_400_BAD_REQUEST)

        result = list_player_for_sale(
            team_id=int(team_id),
            player_id=int(player_id),
            price_usd=Decimal(str(price_usd)),
            listing_type=listing_type
        )

        if result['success']:
            return Response(result, status=status.HTTP_201_CREATED)
        else:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)


class BuyPlayerDirectView(views.APIView):
    """
    Buys a fixed-price player directly.
    """
    def post(self, request):
        if not hasattr(request.user, 'team') or request.user.team is None:
            return Response({'error': 'You must have a team to buy players.'}, status=status.HTTP_403_FORBIDDEN)
        buyer_team_id = request.user.team.id
        listing_id = request.data.get('listing_id')

        if not listing_id:
            return Response({'error': 'listing_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        result = buy_player_direct(buyer_team_id=int(buyer_team_id), listing_id=int(listing_id))

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)


class PlaceBidView(views.APIView):
    """
    Places a bid on an auction listing.
    """
    throttle_scope = 'transfer_bid'
    
    def post(self, request):
        if not hasattr(request.user, 'team') or request.user.team is None:
            return Response({'error': 'You must have a team to place bids.'}, status=status.HTTP_403_FORBIDDEN)
        bidder_team_id = request.user.team.id
        listing_id = request.data.get('listing_id')
        # Frontend sends `amount_usd`; e2e/API clients historically send `bid_amount`.
        # Accept both so the market UI and API clients stay compatible.
        bid_amount = request.data.get('bid_amount') or request.data.get('amount_usd')

        if not listing_id or not bid_amount:
            return Response({'error': 'listing_id and bid_amount are required.'}, status=status.HTTP_400_BAD_REQUEST)

        result = place_bid(
            bidder_team_id=int(bidder_team_id),
            listing_id=int(listing_id),
            bid_amount=Decimal(str(bid_amount))
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)


class AutoReleaseOverflowView(views.APIView):
    """
    Releases excess players if a team exceeds 25 players.
    """
    def post(self, request, team_id):
        result = auto_release_overflow_players(team_id=team_id)
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)


class TransferHistoryListView(generics.ListAPIView):
    """
    Returns global transfer history.
    """
    queryset = TransferHistory.objects.all()
    serializer_class = TransferHistorySerializer


class LeagueDirectoryAPIView(generics.ListAPIView):
    serializer_class = LeagueTeamSerializer
    queryset = Team.objects.all()

class TransferOfferCreateView(views.APIView):
    def post(self, request):
        if not hasattr(request.user, 'team') or not request.user.team:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        target_player_id = request.data.get('target_player_id')
        receiver_team_id = request.data.get('receiver_team_id')
        
        result = create_transfer_offer(
            sender_team_id=request.user.team.id,
            receiver_team_id=receiver_team_id,
            target_player_id=target_player_id,
            data=request.data
        )
        if result['success']:
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

class TransferInboxAPIView(generics.ListAPIView):
    serializer_class = TransferOfferSerializer
    
    def get_queryset(self):
        if not hasattr(self.request.user, 'team') or not self.request.user.team:
            return TransferOffer.objects.none()
        team = self.request.user.team
        return TransferOffer.objects.filter(Q(sender_team=team) | Q(receiver_team=team)).order_by('-created_at')

class TransferOfferActionView(views.APIView):
    def post(self, request, pk, action):
        if not hasattr(request.user, 'team') or not request.user.team:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        team_id = request.user.team.id
        if action == 'accept':
            result = accept_transfer_offer(pk, team_id)
        elif action == 'reject':
            result = reject_transfer_offer(pk, team_id)
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
            
        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

class PlayerReleaseAPIView(views.APIView):
    def post(self, request, pk):
        if not hasattr(request.user, 'team') or not request.user.team:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        result = release_player(pk, request.user.team.id)
        if result['success']:
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

class TransferLogListView(generics.ListAPIView):
    serializer_class = TransferLogSerializer
    queryset = TransferLog.objects.all().order_by('-timestamp')
