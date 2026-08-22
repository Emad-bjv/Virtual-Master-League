from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db import transaction as db_transaction
from .models import StorePackage, Transaction, PaymentRequest, CardToCardSettings
from .serializers import (
    StorePackageSerializer, TransactionSerializer,
    PaymentRequestSerializer, CardToCardSettingsSerializer,
    PaymentReceiptUploadSerializer
)


class StorePackageListView(generics.ListAPIView):
    """
    Returns a list of active store packages available for purchase.
    """
    serializer_class = StorePackageSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = StorePackage.objects.filter(is_active=True)
        curr = self.request.query_params.get('currency_type')
        if curr:
            qs = qs.filter(currency_type=curr)
        return qs


class CardToCardInfoView(views.APIView):
    """
    Returns the admin's bank card info for card-to-card payment.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        settings = CardToCardSettings.objects.filter(is_active=True).first()
        if not settings:
            return Response(
                {'error': 'تنظیمات کارت بانکی هنوز انجام نشده.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = CardToCardSettingsSerializer(settings)
        return Response(serializer.data)


class CreatePaymentRequestView(views.APIView):
    """
    Creates a new card-to-card payment request.
    User selects a package → gets back the payment request ID + card info.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, 'team') or request.user.team is None:
            return Response(
                {'error': 'شما باید یک تیم داشته باشید.'},
                status=status.HTTP_403_FORBIDDEN
            )

        package_id = request.data.get('package_id')
        if not package_id:
            return Response(
                {'error': 'package_id الزامی است.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            package = StorePackage.objects.get(id=package_id, is_active=True)
        except StorePackage.DoesNotExist:
            return Response(
                {'error': 'بسته نامعتبر یا غیرفعال است.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for existing pending requests
        existing = PaymentRequest.objects.filter(
            team=request.user.team,
            status__in=['AWAITING_RECEIPT', 'PENDING_REVIEW']
        ).count()
        if existing >= 3:
            return Response(
                {'error': 'شما حداکثر ۳ درخواست پرداخت فعال می‌توانید داشته باشید.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reward_amt = package.reward_amount or package.usd_amount
        payment_req = PaymentRequest.objects.create(
            team=request.user.team,
            package=package,
            amount_irr=package.price_irr,
            currency_type=package.currency_type,
            reward_amount=reward_amt,
            usd_amount=package.usd_amount or reward_amt,
            status='AWAITING_RECEIPT'
        )

        # Get card info
        card_settings = CardToCardSettings.objects.filter(is_active=True).first()
        card_info = CardToCardSettingsSerializer(card_settings).data if card_settings else None

        return Response({
            'payment_request_id': payment_req.id,
            'package': StorePackageSerializer(package).data,
            'card_info': card_info,
            'message': 'لطفاً مبلغ را به شماره کارت زیر واریز کنید و رسید را آپلود نمایید.'
        }, status=status.HTTP_201_CREATED)


class UploadReceiptView(views.APIView):
    """
    Uploads a receipt image for an existing payment request.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, payment_id):
        if not hasattr(request.user, 'team') or request.user.team is None:
            return Response(
                {'error': 'شما باید یک تیم داشته باشید.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            payment_req = PaymentRequest.objects.get(
                id=payment_id,
                team=request.user.team
            )
        except PaymentRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست پرداخت یافت نشد.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if payment_req.status not in ('AWAITING_RECEIPT', 'PENDING_REVIEW'):
            return Response(
                {'error': 'این درخواست قبلاً بررسی شده است.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = PaymentReceiptUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment_req.receipt_image = serializer.validated_data['receipt_image']
        payment_req.status = 'PENDING_REVIEW'
        payment_req.save(update_fields=['receipt_image', 'status'])

        return Response({
            'message': 'رسید با موفقیت آپلود شد. در انتظار تایید ادمین.',
            'payment_request': PaymentRequestSerializer(payment_req).data
        })


class MyPaymentRequestsView(generics.ListAPIView):
    """
    Returns current user's payment request history.
    """
    serializer_class = PaymentRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not hasattr(self.request.user, 'team') or not self.request.user.team:
            return PaymentRequest.objects.none()
        return PaymentRequest.objects.filter(team=self.request.user.team)


class AdminPaymentRequestListView(generics.ListAPIView):
    """
    Returns all payment requests for admin review.
    """
    serializer_class = PaymentRequestSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status')
        if status_filter:
            return PaymentRequest.objects.filter(status=status_filter)
        return PaymentRequest.objects.all()


class AdminApprovePaymentView(views.APIView):
    """
    Admin endpoint to approve or reject a payment request.
    On approval, credits virtual dollars to the team's budget.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, payment_id):
        action = request.data.get('action')  # 'approve' or 'reject'
        admin_note = request.data.get('admin_note', '')

        if action not in ('approve', 'reject'):
            return Response(
                {'error': 'action باید approve یا reject باشد.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment_req = PaymentRequest.objects.select_related('team', 'package').get(
                id=payment_id
            )
        except PaymentRequest.DoesNotExist:
            return Response(
                {'error': 'درخواست پرداخت یافت نشد.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if payment_req.status not in ('PENDING_REVIEW', 'AWAITING_RECEIPT'):
            return Response(
                {'error': 'این درخواست قبلاً بررسی شده است.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with db_transaction.atomic():
            if action == 'approve':
                payment_req.status = 'APPROVED'
                payment_req.admin_note = admin_note
                payment_req.reviewed_at = timezone.now()
                payment_req.save(update_fields=['status', 'admin_note', 'reviewed_at'])

                # Credit virtual dollars or gems to team
                team = payment_req.team
                reward_amt = payment_req.reward_amount or payment_req.usd_amount
                currency_type = payment_req.currency_type or (payment_req.package.currency_type if payment_req.package else 'BUDGET')

                if currency_type == 'GEMS':
                    team.gems += int(reward_amt)
                    team.save(update_fields=['gems'])
                    reward_desc = f"{int(reward_amt)} جم"
                else:
                    team.budget += reward_amt
                    team.save(update_fields=['budget'])
                    reward_desc = f"{reward_amt} دلار مجازی"

                # Create transaction record
                Transaction.objects.create(
                    team=team,
                    currency=currency_type,
                    amount=reward_amt,
                    amount_irr=payment_req.amount_irr,
                    transaction_type='STORE_PURCHASE',
                    status='SUCCESS',
                    description=f"خرید بسته {payment_req.package.name if payment_req.package else 'نامشخص'} - کارت به کارت - تایید ادمین"
                )

                return Response({
                    'message': f'پرداخت تایید شد. {reward_desc} به تیم {team.name} اضافه شد.',
                    'new_budget': str(team.budget),
                    'new_gems': team.gems
                })
            else:
                payment_req.status = 'REJECTED'
                payment_req.admin_note = admin_note
                payment_req.reviewed_at = timezone.now()
                payment_req.save(update_fields=['status', 'admin_note', 'reviewed_at'])

                return Response({
                    'message': 'درخواست پرداخت رد شد.',
                    'admin_note': admin_note
                })


class TransactionHistoryView(generics.ListAPIView):
    """
    Returns transaction history for the current user's team.
    """
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not hasattr(self.request.user, 'team') or not self.request.user.team:
            return Transaction.objects.none()
        return Transaction.objects.filter(team=self.request.user.team)


class TeamRevenueBreakdownView(views.APIView):
    """
    Returns itemized club revenue breakdown categorized into:
    1. MATCH_WINS: Match victory rewards and bonuses
    2. TRANSFERS: Player transfer sales and releases
    3. BUDGET_PURCHASES: Store package / admin budget injections
    4. TASKS_MISSIONS: Season pass and completed mission rewards
    """
    permission_classes = [AllowAny]

    def get(self, request, team_id):
        from teams.models import Team
        from transfers.models import TransferHistory

        team = Team.objects.filter(id=team_id).first()
        if not team:
            return Response({'error': 'تیم مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Match Wins Revenue
        match_txs = Transaction.objects.filter(
            team=team,
            transaction_type__in=['MATCH_REWARD', 'UNDERDOG_BONUS'],
            amount__gt=0
        ).order_by('-created_at')
        
        match_items = []
        match_total = 0.0
        for tx in match_txs:
            amt = float(tx.amount)
            match_total += amt
            match_items.append({
                'id': f"m_tx_{tx.id}",
                'title': 'پاداش پیروزی در مسابقه',
                'description': tx.description or 'پاداش رسمی کسب پیروزی در مسابقه لیگ',
                'amount': amt,
                'date': tx.created_at.strftime('%Y/%m/%d %H:%M') if tx.created_at else ''
            })

        # 2. Transfers & Player Sales
        transfer_txs = Transaction.objects.filter(
            team=team,
            transaction_type='TRANSFER_SELL',
            amount__gt=0
        ).order_by('-created_at')

        transfer_items = []
        transfer_total = 0.0
        for tx in transfer_txs:
            amt = float(tx.amount)
            transfer_total += amt
            transfer_items.append({
                'id': f"t_tx_{tx.id}",
                'title': 'فروش بازیکن',
                'description': tx.description or 'درآمد حاصل از انتقال یا آزادسازی بازیکن',
                'amount': amt,
                'date': tx.created_at.strftime('%Y/%m/%d %H:%M') if tx.created_at else ''
            })

        for th in TransferHistory.objects.filter(seller_team=team).select_related('player', 'buyer_team')[:20]:
            if th.transfer_fee and float(th.transfer_fee) > 0:
                p_name = th.player.name if th.player else 'بازیکن'
                if not any(item.get('description', '').startswith(f"فروش {p_name}") for item in transfer_items):
                    amt = float(th.transfer_fee)
                    transfer_total += amt
                    transfer_items.append({
                        'id': f"th_{th.id}",
                        'title': f"فروش بازیکن {p_name}",
                        'description': f"انتقال قطعی به {th.buyer_team.name if th.buyer_team else 'تیم خریدار'}",
                        'amount': amt,
                        'date': th.timestamp.strftime('%Y/%m/%d %H:%M') if th.timestamp else ''
                    })

        # 3. Budget Purchases & Injections
        purchase_txs = Transaction.objects.filter(
            team=team,
            transaction_type__in=['STORE_PURCHASE', 'ADMIN_ADJUST'],
            amount__gt=0
        ).order_by('-created_at')

        purchase_items = []
        purchase_total = 0.0
        for tx in purchase_txs:
            amt = float(tx.amount)
            purchase_total += amt
            purchase_items.append({
                'id': f"p_tx_{tx.id}",
                'title': 'خرید بودجه / شارژ مالی',
                'description': tx.description or 'واریز بسته فروشگاه به بودجه باشگاه',
                'amount': amt,
                'date': tx.created_at.strftime('%Y/%m/%d %H:%M') if tx.created_at else ''
            })

        # 4. Tasks & Missions (Season Pass)
        task_txs = Transaction.objects.filter(
            team=team,
            transaction_type='SEASON_PASS_REWARD',
            amount__gt=0
        ).order_by('-created_at')

        task_items = []
        task_total = 0.0
        for tx in task_txs:
            amt = float(tx.amount)
            task_total += amt
            task_items.append({
                'id': f"tsk_tx_{tx.id}",
                'title': 'پاداش تسک و ماموریت',
                'description': tx.description or 'پاداش ماموریت سیزن‌پس',
                'amount': amt,
                'date': tx.created_at.strftime('%Y/%m/%d %H:%M') if tx.created_at else ''
            })

        total_revenue = match_total + transfer_total + purchase_total + task_total

        return Response({
            'team_id': team.id,
            'team_name': team.name,
            'total_revenue': total_revenue,
            'categories': {
                'match_wins': {
                    'title': 'پیروزی در مسابقات',
                    'icon': 'Trophy',
                    'color': 'emerald',
                    'total': match_total,
                    'count': len(match_items),
                    'items': match_items[:20]
                },
                'transfers': {
                    'title': 'نقل و انتقالات و فروش بازیکن',
                    'icon': 'ArrowRightLeft',
                    'color': 'cyan',
                    'total': transfer_total,
                    'count': len(transfer_items),
                    'items': transfer_items[:20]
                },
                'budget_purchases': {
                    'title': 'خرید بودجه و شارژ مالی',
                    'icon': 'CreditCard',
                    'color': 'amber',
                    'total': purchase_total,
                    'count': len(purchase_items),
                    'items': purchase_items[:20]
                },
                'tasks_missions': {
                    'title': 'پاداش تسک‌ها و ماموریت‌ها',
                    'icon': 'CheckCircle2',
                    'color': 'purple',
                    'total': task_total,
                    'count': len(task_items),
                    'items': task_items[:20]
                }
            }
        }, status=status.HTTP_200_OK)
