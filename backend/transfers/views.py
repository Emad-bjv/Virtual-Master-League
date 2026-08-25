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
        queryset = TransferListing.objects.filter(status='ACTIVE').select_related(
            'player', 'seller_team', 'highest_bidder'
        )
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
    Buys a listed player directly at the fixed asking price.
    """
    def post(self, request):
        if not hasattr(request.user, 'team') or request.user.team is None:
            return Response({'error': 'You must have a team to buy players.'}, status=status.HTTP_403_FORBIDDEN)
        buyer_team_id = request.user.team.id
        listing_id = request.data.get('listing_id')

        if not listing_id:
            return Response({'error': 'listing_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        result = buy_player_direct(
            buyer_team_id=int(buyer_team_id),
            listing_id=int(listing_id)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)


class PlaceBidView(views.APIView):
    """
    Places a bid on an auction-style listing.
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
    queryset = TransferHistory.objects.all().select_related('player', 'seller_team', 'buyer_team')
    serializer_class = TransferHistorySerializer


class LeagueDirectoryAPIView(generics.ListAPIView):
    serializer_class = LeagueTeamSerializer
    queryset = Team.objects.all().prefetch_related('players')

def get_authenticated_user_team(request):
    user = request.user
    if not user or not user.is_authenticated:
        return None
    # 1. From explicit sender_team_id if sent
    sender_id = request.data.get('sender_team_id') if hasattr(request, 'data') else None
    if sender_id:
        t = Team.objects.filter(id=sender_id).first()
        if t and (t.manager == user or user.is_staff or user.is_superuser or getattr(user, 'role', '') == 'admin'):
            return t
    # 2. From team where user is manager
    t = Team.objects.filter(manager=user).first()
    if t:
        return t
    # 3. From user.team reverse relation safely
    try:
        if hasattr(user, 'team') and user.team:
            return user.team
    except Exception:
        pass
    # 4. If superuser or admin, fallback to first team (e.g. Milan)
    if user.is_staff or user.is_superuser or getattr(user, 'role', '') == 'admin':
        return Team.objects.filter(name__icontains='Milan').first() or Team.objects.first()
    return None


class TransferOfferCreateView(views.APIView):
    def post(self, request):
        user_team = get_authenticated_user_team(request)
        if not user_team:
            return Response({'error': 'تیم شما مشخص نیست. لطفاً مجدداً وارد حساب کاربری خود شوید.'}, status=status.HTTP_403_FORBIDDEN)
            
        sender_team_id = user_team.id
        receiver_team_id = request.data.get('receiver_team_id')
        target_player_id = request.data.get('target_player_id') or request.data.get('player_id')
        
        if not target_player_id or not receiver_team_id:
            return Response({'error': 'شناسه بازیکن و تیم مقصد الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)
        
        result = create_transfer_offer(
            sender_team_id=sender_team_id,
            receiver_team_id=receiver_team_id,
            target_player_id=target_player_id,
            data=request.data
        )
        
        if result.get('success'):
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

class TransferOfferListView(generics.ListAPIView):
    serializer_class = TransferOfferSerializer
    
    def get_queryset(self):
        user_team = get_authenticated_user_team(self.request)
        if not user_team:
            return TransferOffer.objects.none()
        # Exclude superseded offers so only latest active / completed offers are displayed
        return TransferOffer.objects.filter(
            Q(sender_team=user_team) | Q(receiver_team=user_team)
        ).select_related(
            'target_player', 'sender_team', 'receiver_team'
        ).prefetch_related(
            'swap_players'
        ).exclude(
            status='SUPERSEDED'
        ).order_by('-updated_at')

TransferInboxAPIView = TransferOfferListView

class TransferOfferActionView(views.APIView):
    def post(self, request, pk, action):
        user_team = get_authenticated_user_team(request)
        if not user_team:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        team_id = user_team.id
        if action == 'accept':
            result = accept_transfer_offer(pk, team_id)
        elif action == 'reject':
            result = reject_transfer_offer(pk, team_id)
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)
            
        if result.get('success'):
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

class PlayerReleaseAPIView(views.APIView):
    def post(self, request, pk):
        user_team = get_authenticated_user_team(request)
        if not user_team:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        result = release_player(pk, user_team.id)
        if result.get('success'):
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

class TransferLogListView(generics.ListAPIView):
    serializer_class = TransferLogSerializer
    queryset = TransferLog.objects.all().order_by('-timestamp')


class FreeAgentsAPIView(generics.ListAPIView):
    """
    Returns the list of unassigned / free agent players.
    """
    from .serializers import SimplePlayerSerializer
    serializer_class = SimplePlayerSerializer
    queryset = Player.objects.filter(team__isnull=True).order_by('-overall')


class SignFreeAgentAPIView(views.APIView):
    """
    Signs a free agent player to the user's club.
    """
    def post(self, request, pk):
        user_team = get_authenticated_user_team(request)
        if not user_team:
            return Response({'error': 'باشگاه شما مشخص نیست. لطفاً وارد شوید.'}, status=status.HTTP_403_FORBIDDEN)
            
        player = Player.objects.filter(id=pk, team__isnull=True).first()
        if not player:
            return Response({'error': 'این بازیکن یافت نشد یا دیگر بازیکن آزاد نیست.'}, status=status.HTTP_404_NOT_FOUND)
            
        if user_team.players.count() >= user_team.max_squad_size:
            return Response({
                'error': f'ظرفیت لیست بازیکنان تیم شما تکمیل است ({user_team.players.count()} از حداکثر {user_team.max_squad_size} بازیکن). ابتدا باید بازیکن مازاد را آزاد یا معاوضه کنید.'
            }, status=status.HTTP_400_BAD_REQUEST)

        signing_fee = Decimal(str(player.market_value if (player.market_value and player.market_value > 0) else player.wage * Decimal('50.0')))
        if user_team.budget < signing_fee:
            return Response({'error': f'بودجه باشگاه ({float(user_team.budget):,.0f} $) برای جذب این بازیکن آزاد ({float(signing_fee):,.0f} $) کافی نیست.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.db import transaction
        from economy.services import process_atomic_wallet_update
        from realtime.events import notify_admin
        from notifications.services import create_notification
        from .negotiation_services import ensure_team_starting_eleven

        with transaction.atomic():
            wallet_res = process_atomic_wallet_update(user_team.id, -signing_fee, 'BUDGET', 'FREE_AGENT_SIGNING', f"جذب بازیکن آزاد {player.name}")
            if not wallet_res.get('success', True) and 'error' in wallet_res:
                return Response({'error': wallet_res.get('error')}, status=status.HTTP_400_BAD_REQUEST)

            player.team = user_team
            player.is_starting = False
            player.save()
            ensure_team_starting_eleven(user_team)
            user_team.update_star_rating(save=True)
            
            TransferHistory.objects.create(
                player=player,
                seller_team=None,
                buyer_team=user_team,
                price_usd=signing_fee,
                transfer_type='FREE_AGENT'
            )
            TransferLog.objects.create(
                event_type='FREE_AGENT_SIGNED',
                description=f"تیم {user_team.name} بازیکن آزاد «{player.name}» را با مبلغ {float(signing_fee):,.0f} $ جذب کرد."
            )
            notify_admin(f"🌟 جذب بازیکن آزاد: تیم {user_team.name} بازیکن {player.name} را جذب کرد.")
            create_notification(
                team=user_team,
                category='TRANSFER',
                title='🎉 جذب بازیکن آزاد',
                message=f"بازیکن آزاد «{player.name}» با موفقیت به ترکیب باشگاه شما پیوست و مبلغ ${float(signing_fee):,.0f} از بودجه باشگاه کسر شد."
            )
            return Response({
                'success': True, 
                'message': f'بازیکن «{player.name}» با موفقیت جذب شد و به ترکیب تیم پیوست.',
                'fee': float(signing_fee)
            })

