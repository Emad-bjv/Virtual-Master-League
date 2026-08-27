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
    queryset = TransferLog.objects.select_related(
        'related_offer__sender_team',
        'related_offer__receiver_team',
        'related_offer__target_player'
    ).prefetch_related(
        'related_offer__swap_players'
    ).order_by('-timestamp')


class FreeAgentsAPIView(generics.ListAPIView):
    """
    Returns the list of unassigned / free agent players.
    """
    from .serializers import SimplePlayerSerializer
    serializer_class = SimplePlayerSerializer
    queryset = Player.objects.filter(team__isnull=True, is_free_agent=True).order_by('-overall')


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
            
        signing_fee = Decimal(str(player.market_value if player.market_value > 0 else player.wage * Decimal('50.0')))
        if user_team.budget < signing_fee:
            return Response({'error': f'بودجه باشگاه ({float(user_team.budget):,.0f} $) برای جذب این بازیکن آزاد ({float(signing_fee):,.0f} $) کافی نیست.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.db import transaction
        from economy.services import process_atomic_wallet_update
        from realtime.events import notify_admin
        from notifications.services import create_notification
        from .negotiation_services import ensure_team_starting_eleven

        with transaction.atomic():
            process_atomic_wallet_update(user_team.id, -signing_fee, 'BUDGET', 'FREE_AGENT_SIGNING', f"جذب بازیکن آزاد {player.name}")
            player.team = user_team
            player.is_free_agent = False
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
                message=f"بازیکن آزاد «{player.name}» با موفقیت به ترکیب باشگاه شما پیوست."
            )
            return Response({'success': True, 'message': f'بازیکن «{player.name}» با موفقیت جذب شد.'})


class TeamTransferAuditAPIView(views.APIView):
    """
    API endpoint for transfer inspection, anti-brokerage and fraud detection.
    Returns financial balances, collusion risks, price discrepancy flags, and trading partners.
    """
    def get(self, request):
        from .serializers import resolve_team_logo_url
        from teams.serializers import resolve_player_photo_url
        from collections import defaultdict
        from datetime import timedelta

        team_id = request.query_params.get('team_id')
        teams = Team.objects.all().order_by('name')
        teams_list = [
            {
                'id': t.id,
                'name': t.name,
                'logo': resolve_team_logo_url(t),
                'budget': float(t.budget or 0),
                'star_rating': t.star_rating,
                'manager_name': t.manager.username if t.manager else 'نامشخص'
            }
            for t in teams
        ]

        target_team = None
        if team_id and str(team_id).lower() != 'all':
            target_team = Team.objects.filter(id=team_id).first()

        # Query all transfer history
        history_qs = TransferHistory.objects.select_related('player', 'seller_team', 'buyer_team').order_by('-transferred_at')
        if target_team:
            history_qs = history_qs.filter(Q(seller_team=target_team) | Q(buyer_team=target_team))

        total_spent = Decimal('0.00')
        total_earned = Decimal('0.00')
        buy_count = 0
        sell_count = 0
        loan_count = 0
        swap_count = 0
        partner_counts = defaultdict(lambda: {'count': 0, 'volume': Decimal('0.00'), 'team': None})
        risk_flags_detected = []

        # Track transactions per player to detect quick flips (bought & sold in < 72h)
        all_histories = list(history_qs)
        player_trade_dates = defaultdict(list)
        for h in all_histories:
            if h.player_id:
                player_trade_dates[h.player_id].append((h.transferred_at, h.seller_team_id, h.buyer_team_id))

        transactions = []
        for h in all_histories:
            p = h.player
            seller = h.seller_team
            buyer = h.buyer_team
            price = Decimal(str(h.price_usd or 0))
            ttype = (h.transfer_type or 'DIRECT_TRANSFER').upper()

            # Determine role relative to selected team (if filtering by team)
            is_target_buyer = (target_team and buyer and buyer.id == target_team.id)
            is_target_seller = (target_team and seller and seller.id == target_team.id)

            if target_team:
                if is_target_buyer:
                    total_spent += price
                    buy_count += 1
                    if seller:
                        partner_counts[seller.id]['count'] += 1
                        partner_counts[seller.id]['volume'] += price
                        partner_counts[seller.id]['team'] = seller
                elif is_target_seller:
                    total_earned += price
                    sell_count += 1
                    if buyer:
                        partner_counts[buyer.id]['count'] += 1
                        partner_counts[buyer.id]['volume'] += price
                        partner_counts[buyer.id]['team'] = buyer
            else:
                total_spent += price
                if ttype == 'LOAN':
                    loan_count += 1
                elif ttype == 'SWAP':
                    swap_count += 1
                else:
                    buy_count += 1

            if ttype == 'LOAN':
                loan_count += 1
            elif ttype == 'SWAP':
                swap_count += 1

            # Fraud & Risk Flags Calculation
            tx_flags = []
            market_val = Decimal(str(p.market_value or 0)) if p else Decimal('0.00')
            
            # 1. Overpriced Flag (> 2.5x Market Value)
            if market_val > Decimal('500000') and price > (market_val * Decimal('2.50')):
                tx_flags.append({
                    'code': 'OVERPRICED',
                    'level': 'HIGH',
                    'title': '🚨 گران‌فروشی غیرعادی',
                    'description': f"مبلغ معامله ({float(price):,.0f} $) بیش از ۲.۵ برابر ارزش بازار بازیکن ({float(market_val):,.0f} $) است."
                })

            # 2. Underpriced Flag (< 40% Market Value on expensive players)
            if market_val > Decimal('2000000') and price < (market_val * Decimal('0.40')) and price > 0 and ttype not in ['LOAN', 'SWAP']:
                tx_flags.append({
                    'code': 'UNDERPRICED',
                    'level': 'MEDIUM',
                    'title': '🚨 ارزان‌فروشی مشکوک',
                    'description': f"مبلغ معامله کمتر از ۴۰٪ ارزش واقعی بازار است (تخفیف نامتعارف و احتمال تبانی)."
                })

            # 3. Zero Fee on High Overall Star
            if p and p.overall >= 80 and price == 0 and ttype in ['DIRECT_TRANSFER', 'FIXED_PRICE']:
                tx_flags.append({
                    'code': 'ZERO_FEE_STAR',
                    'level': 'HIGH',
                    'title': '🚨 انتقال رایگان ستاره',
                    'description': f"بازیکن شاخص با اورال {p.overall} بدون پرداخت نقدینگی منتقل شده است."
                })

            # 4. Quick Flip Detection (< 72 hours between trades)
            if p and len(player_trade_dates[p.id]) > 1:
                dates = sorted([d[0] for d in player_trade_dates[p.id]])
                for i in range(len(dates) - 1):
                    if abs((dates[i+1] - dates[i]).total_seconds()) < 72 * 3600:
                        tx_flags.append({
                            'code': 'QUICK_FLIP',
                            'level': 'MEDIUM',
                            'title': '⚡ چرخش سریع (Quick Flip)',
                            'description': 'این بازیکن در کمتر از ۷۲ ساعت دو بار معامله شده است.'
                        })
                        break

            # 5. Collusion frequency with partner
            counterpart = seller if is_target_buyer else buyer
            if target_team and counterpart and partner_counts[counterpart.id]['count'] >= 3:
                tx_flags.append({
                    'code': 'COLLUSION_RISK',
                    'level': 'HIGH',
                    'title': '🤝 معاملات مکرر بین دو باشگاه',
                    'description': f"تاکنون {partner_counts[counterpart.id]['count']} معامله بین این دو باشگاه صورت گرفته است."
                })

            if tx_flags:
                risk_flags_detected.extend(tx_flags)

            # Check if rollback is feasible (buyer currently owns the player)
            can_rollback = bool(p and buyer and p.team_id == buyer.id)

            transactions.append({
                'history_id': h.id,
                'transferred_at': h.transferred_at,
                'transfer_type': ttype,
                'transfer_type_display': h.get_transfer_type_display() if hasattr(h, 'get_transfer_type_display') else ttype,
                'player_id': p.id if p else None,
                'player_name': p.name if p else 'بازیکن',
                'player_overall': p.overall if p else 0,
                'player_position': p.position if p else '-',
                'player_photo': resolve_player_photo_url(p) if p else None,
                'market_value': float(market_val),
                'price_usd': float(price),
                'price_ratio': round(float(price / market_val), 2) if market_val > 0 else 1.0,
                'seller_team_id': seller.id if seller else None,
                'seller_team_name': seller.name if seller else 'بازیکن آزاد',
                'seller_team_logo': resolve_team_logo_url(seller),
                'buyer_team_id': buyer.id if buyer else None,
                'buyer_team_name': buyer.name if buyer else 'لیست آزاد',
                'buyer_team_logo': resolve_team_logo_url(buyer),
                'role': 'BUYER' if is_target_buyer else ('SELLER' if is_target_seller else 'NEUTRAL'),
                'risk_flags': tx_flags,
                'can_rollback': can_rollback,
            })

        # Calculate Overall Risk Score
        high_flags_count = len([f for f in risk_flags_detected if f.get('level') == 'HIGH'])
        med_flags_count = len([f for f in risk_flags_detected if f.get('level') == 'MEDIUM'])
        
        if high_flags_count >= 2 or (high_flags_count >= 1 and med_flags_count >= 2):
            overall_risk = 'HIGH'
            risk_label = '🔴 ریسک بالا (مشکوک به تبانی / دلالی)'
        elif high_flags_count >= 1 or med_flags_count >= 2:
            overall_risk = 'MEDIUM'
            risk_label = '🟡 ریسک متوسط (نیازمند بازرسی)'
        else:
            overall_risk = 'LOW'
            risk_label = '🟢 وضعیت سالم و شفاف'

        # Partner breakdown
        partners_list = [
            {
                'partner_id': pid,
                'partner_name': data['team'].name if data['team'] else 'نامشخص',
                'partner_logo': resolve_team_logo_url(data['team']),
                'total_deals': data['count'],
                'total_volume': float(data['volume']),
                'is_suspicious': data['count'] >= 3
            }
            for pid, data in partner_counts.items()
        ]
        partners_list.sort(key=lambda x: x['total_deals'], reverse=True)

        return Response({
            'teams': teams_list,
            'selected_team': {
                'id': target_team.id,
                'name': target_team.name,
                'logo': resolve_team_logo_url(target_team),
                'budget': float(target_team.budget or 0),
                'star_rating': target_team.star_rating,
                'manager_name': target_team.manager.username if target_team.manager else 'نامشخص'
            } if target_team else None,
            'summary': {
                'total_spent': float(total_spent),
                'total_earned': float(total_earned),
                'net_balance': float(total_earned - total_spent),
                'buy_count': buy_count,
                'sell_count': sell_count,
                'loan_count': loan_count,
                'swap_count': swap_count,
                'total_transactions': len(transactions),
                'risk_score': overall_risk,
                'risk_label': risk_label,
                'high_flags_count': high_flags_count,
                'med_flags_count': med_flags_count,
            },
            'trading_partners': partners_list,
            'transactions': transactions
        })


class AdminRollbackTransferAPIView(views.APIView):
    """
    Emergency transfer rollback by league administrators.
    Reverses player ownership and refunds cash transaction atomically.
    """
    def post(self, request):
        user = request.user
        if not (user and (user.is_staff or user.is_superuser)):
            return Response({'error': 'تنها مدیران ارشد سیستم اجازه ابطال اضطراری معاملات را دارند.'}, status=status.HTTP_403_FORBIDDEN)

        history_id = request.data.get('history_id')
        reason = request.data.get('reason', 'دستور مدیریت لیگ مبنی بر تخلف یا اصلاح اشتباه')

        if not history_id:
            return Response({'error': 'شناسه رکورد معامله (history_id) ارسال نشده است.'}, status=status.HTTP_400_BAD_REQUEST)

        history = TransferHistory.objects.filter(id=history_id).select_related('player', 'seller_team', 'buyer_team').first()
        if not history:
            return Response({'error': 'رکورد تاریخچه معامله یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        player = history.player
        seller = history.seller_team
        buyer = history.buyer_team
        price = Decimal(str(history.price_usd or 0))

        if not player:
            return Response({'error': 'بازیکن مورد نظر در سیستم یافت نشد.'}, status=status.HTTP_400_BAD_REQUEST)

        if not seller:
            return Response({'error': 'تیم مبدأ مشخص نیست (امکان ابطال بازیکن آزاد وجود ندارد).'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if buyer still has the player
        if buyer and player.team_id != buyer.id:
            return Response({
                'error': f'بازیکن «{player.name}» دیگر در تیم خریدار ({buyer.name}) حضور ندارد و معامله بعدی انجام داده است. امکان ابطال مستقیم وجود ندارد.'
            }, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction
        from economy.services import process_atomic_wallet_update
        from realtime.events import notify_admin
        from notifications.services import create_notification
        from .negotiation_services import ensure_team_starting_eleven

        try:
            with transaction.atomic():
                # 1. Reverse player ownership
                player.team = seller
                player.loan_owner_team = None
                player.loan_matches_left = 0
                player.is_starting = False
                player.x_coord = 0.0
                player.y_coord = 0.0
                player.save()

                # 2. Refund money
                if price > 0:
                    # Refund to buyer
                    if buyer:
                        res_b = process_atomic_wallet_update(buyer.id, price, 'BUDGET', 'MANUAL_ADJUSTMENT', f"استرداد وجه ابطال معامله {player.name} توسط ادمین")
                        if not res_b.get('success'):
                            return Response({'error': f"خطا در استرداد وجه به خریدار: {res_b.get('error')}"}, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Deduct from seller (95% net or 100%)
                    tax_rate = Decimal('0.05')
                    net_seller_amount = price * (Decimal('1.00') - tax_rate)
                    res_s = process_atomic_wallet_update(seller.id, -net_seller_amount, 'BUDGET', 'MANUAL_ADJUSTMENT', f"کسر وجه ابطال معامله {player.name} توسط ادمین")
                    if not res_s.get('success'):
                        # If seller has spent the money, deduct whatever available or adjust
                        seller.budget = max(Decimal('0.00'), (seller.budget or Decimal('0.00')) - net_seller_amount)
                        seller.save(update_fields=['budget'])

                # 3. Maintain starting XI integrity
                if buyer:
                    ensure_team_starting_eleven(buyer)
                ensure_team_starting_eleven(seller)

                # 4. Log the rollback event
                log_desc = f"🚨 ابطال اضطراری انتقال توسط ادمین: معامله بازیکن «{player.name}» با مبلغ {float(price):,.0f} $ میان {seller.name} و {buyer.name if buyer else 'تیم خریدار'} به دلیل «{reason}» لغو و بازیکن به {seller.name} بازگردانده شد."
                TransferLog.objects.create(
                    event_type='ADMIN_ROLLBACK',
                    description=log_desc
                )

                # 5. Notifications
                notify_admin(f"🚨 ابطال معامله: انتقال {player.name} به {buyer.name if buyer else ''} فسخ شد.")
                if buyer:
                    create_notification(
                        team=buyer,
                        category='TRANSFER',
                        title='⚠️ ابطال انتقال بازیکن توسط مدیریت لیگ',
                        message=f"معامله خرید بازیکن «{player.name}» به دستور ادمین باطل گردید و مبلغ ${float(price):,.0f} به بودجه باشگاه شما مسترد شد."
                    )
                create_notification(
                    team=seller,
                    category='TRANSFER',
                    title='🔄 بازگشت بازیکن به باشگاه (ابطال معامله)',
                    message=f"معامله واگذاری «{player.name}» توسط مدیریت لیگ فسخ و بازیکن به ترکیب تیم شما بازگشت."
                )

                return Response({
                    'success': True,
                    'message': f"معامله بازیکن «{player.name}» با موفقیت باطل شد و بازیکن به تیم {seller.name} بازگشت."
                })
        except Exception as e:
            return Response({'error': f'خطای سیستمی در ابطال معامله: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

