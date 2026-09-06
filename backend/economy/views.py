from decimal import Decimal
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db import transaction as db_transaction
from .models import StorePackage, Transaction, PaymentRequest, CardToCardSettings, MassRewardGrant
from .serializers import (
    StorePackageSerializer, TransactionSerializer,
    PaymentRequestSerializer, CardToCardSettingsSerializer,
    PaymentReceiptUploadSerializer, MassRewardGrantSerializer
)
from teams.models import Team
from notifications.models import Notification


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
    Allows admins to update card details.
    """
    def get_permissions(self):
        if self.request.method in ['POST', 'PATCH', 'PUT']:
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        settings = CardToCardSettings.objects.filter(is_active=True).first()
        if not settings:
            settings = CardToCardSettings.objects.first()
        if not settings:
            return Response(
                {'error': 'تنظیمات کارت بانکی هنوز انجام نشده.', 'card_number': '', 'card_holder_name': '', 'bank_name': ''},
                status=status.HTTP_200_OK
            )
        serializer = CardToCardSettingsSerializer(settings)
        return Response(serializer.data)

    def post(self, request):
        is_admin = request.user.is_staff or request.user.is_superuser or getattr(request.user, 'role', '') in ['admin', 'superadmin']
        if not is_admin:
            return Response({'error': 'دسترسی فقط مخصوص مدیر سیستم است.'}, status=status.HTTP_403_FORBIDDEN)

        card_number = request.data.get('card_number', '').strip()
        card_holder_name = request.data.get('card_holder_name', '').strip()
        bank_name = request.data.get('bank_name', '').strip()
        is_active = request.data.get('is_active', True)

        if not card_number or not card_holder_name:
            return Response({'error': 'شماره کارت و نام صاحب حساب الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        settings = CardToCardSettings.objects.first()
        if not settings:
            settings = CardToCardSettings()

        settings.card_number = card_number
        settings.card_holder_name = card_holder_name
        settings.bank_name = bank_name
        settings.is_active = bool(is_active)
        settings.save()

        return Response({
            'status': 'اطلاعات کارت بانکی با موفقیت در سیستم بروزرسانی شد.',
            'data': CardToCardSettingsSerializer(settings).data
        })


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
        bonus_amt = package.bonus_amount or 0
        payment_req = PaymentRequest.objects.create(
            team=request.user.team,
            package=package,
            amount_irr=package.effective_price_irr,
            currency_type=package.currency_type,
            reward_amount=reward_amt,
            bonus_amount=bonus_amt,
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

                # Credit virtual dollars or gems to team (including bonus)
                team = payment_req.team
                base_amt = payment_req.reward_amount or payment_req.usd_amount or Decimal('0.00')
                bonus_amt = payment_req.bonus_amount or Decimal('0.00')
                total_reward_amt = base_amt + bonus_amt
                currency_type = payment_req.currency_type or (payment_req.package.currency_type if payment_req.package else 'BUDGET')

                if currency_type == 'GEMS':
                    team.gems += int(total_reward_amt)
                    team.save(update_fields=['gems'])
                    if bonus_amt > 0:
                        reward_desc = f"{int(total_reward_amt)} جم (شامل {int(bonus_amt)} جم پاداش هدیه)"
                    else:
                        reward_desc = f"{int(total_reward_amt)} جم"
                else:
                    team.budget += total_reward_amt
                    team.save(update_fields=['budget'])
                    if bonus_amt > 0:
                        reward_desc = f"{total_reward_amt} دلار مجازی (شامل {bonus_amt} دلار پاداش هدیه)"
                    else:
                        reward_desc = f"{total_reward_amt} دلار مجازی"

                # Create transaction record
                bonus_text = f" (+{bonus_amt} هدیه)" if bonus_amt > 0 else ""
                Transaction.objects.create(
                    team=team,
                    currency=currency_type,
                    amount=total_reward_amt,
                    amount_irr=payment_req.amount_irr,
                    transaction_type='STORE_PURCHASE',
                    status='SUCCESS',
                    description=f"خرید بسته {payment_req.package.name if payment_req.package else 'نامشخص'}{bonus_text} - کارت به کارت - تایید ادمین"
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


class AdminStorePackageListCreateView(generics.ListCreateAPIView):
    """
    Admin API to list all store packages (including inactive) and create new packages.
    """
    serializer_class = StorePackageSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = StorePackage.objects.all().order_by('sort_order', '-id')
        currency_type = self.request.query_params.get('currency_type')
        is_active = self.request.query_params.get('is_active')

        if currency_type:
            qs = qs.filter(currency_type=currency_type)
        if is_active is not None:
            if is_active.lower() in ('true', '1'):
                qs = qs.filter(is_active=True)
            elif is_active.lower() in ('false', '0'):
                qs = qs.filter(is_active=False)

        return qs


class AdminStorePackageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin API to retrieve, update, or soft-delete a store package.
    """
    serializer_class = StorePackageSerializer
    permission_classes = [IsAdminUser]
    queryset = StorePackage.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(
            {'message': f'بسته «{instance.name}» با موفقیت غیرفعال شد.', 'id': instance.id},
            status=status.HTTP_200_OK
        )


class AdminStorePackageToggleView(views.APIView):
    """
    Admin API to quickly toggle the active status of a store package.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            package = StorePackage.objects.get(pk=pk)
        except StorePackage.DoesNotExist:
            return Response(
                {'error': 'بسته مورد نظر یافت نشد.'},
                status=status.HTTP_404_NOT_FOUND
            )

        package.is_active = not package.is_active
        package.save()
        serializer = StorePackageSerializer(package)
        return Response(
            {
                'message': f'وضعیت بسته «{package.name}» به {"فعال" if package.is_active else "غیرفعال"} تغییر یافت.',
                'package': serializer.data
            },
            status=status.HTTP_200_OK
        )


class AdminMassRewardView(views.APIView):
    """
    Admin API to grant mass rewards (Gems, Budget) to all or selected teams,
    creating atomic transaction logs, notifications, and grant history.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        grants = MassRewardGrant.objects.all().select_related('admin').order_by('-created_at')[:50]
        serializer = MassRewardGrantSerializer(grants, many=True)
        return Response({
            'grants': serializer.data,
            'total_count': MassRewardGrant.objects.count()
        }, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data
        title = (data.get('title') or '').strip()
        message = (data.get('message') or '').strip()
        target_type = data.get('target_type', 'ALL')
        team_ids = data.get('team_ids', [])

        try:
            gems_amount = int(data.get('gems_amount', 0) or 0)
            if gems_amount < 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'error': 'مقدار جم باید عدد صحیح نامنفی باشد.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            budget_val = data.get('budget_amount', 0) or 0
            budget_amount = Decimal(str(budget_val))
            if budget_amount < Decimal('0'):
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'error': 'مقدار بودجه باید عدد نامنفی باشد.'}, status=status.HTTP_400_BAD_REQUEST)

        if gems_amount == 0 and budget_amount == Decimal('0'):
            return Response(
                {'error': 'حداقل یکی از مقادیر جم یا بودجه باید بزرگتر از صفر باشد.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not title:
            title = 'پاداش و ایردراپ همگانی'

        # Select target teams
        if target_type == 'SELECTED':
            if not team_ids or not isinstance(team_ids, list):
                return Response({'error': 'حداقل یک تیم باید برای اعطای پاداش انتخاب شود.'}, status=status.HTTP_400_BAD_REQUEST)
            teams = list(Team.objects.filter(id__in=team_ids))
            if not teams:
                return Response({'error': 'هیچ تیمی با شناسه‌های ارسالی یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            target_type = 'ALL'
            teams = list(Team.objects.all())
            if not teams:
                return Response({'error': 'هیچ تیمی در سیستم وجود ندارد.'}, status=status.HTTP_404_NOT_FOUND)

        with db_transaction.atomic():
            transactions_to_create = []
            notifications_to_create = []

            for team in teams:
                if gems_amount > 0:
                    team.gems = (team.gems or 0) + gems_amount
                    transactions_to_create.append(
                        Transaction(
                            team=team,
                            currency='GEMS',
                            amount=Decimal(gems_amount),
                            amount_irr=0,
                            transaction_type='AIRDROP_REWARD',
                            status='SUCCESS',
                            description=f"{title}: {message}" if message else title
                        )
                    )

                if budget_amount > Decimal('0'):
                    team.budget = (team.budget or Decimal('0')) + budget_amount
                    transactions_to_create.append(
                        Transaction(
                            team=team,
                            currency='BUDGET',
                            amount=budget_amount,
                            amount_irr=0,
                            transaction_type='AIRDROP_REWARD',
                            status='SUCCESS',
                            description=f"{title}: {message}" if message else title
                        )
                    )

                team.save()

                action_url = f"/dashboard?reward_gems={gems_amount}&reward_budget={budget_amount}"
                notifications_to_create.append(
                    Notification(
                        team=team,
                        target_role='COACH',
                        category='REWARD',
                        title=title,
                        message=message or f"شما پاداش دریافت کردید: {gems_amount} جم و ${budget_amount:,.0f} دلار",
                        action_url=action_url,
                        is_read=False
                    )
                )

            if transactions_to_create:
                Transaction.objects.bulk_create(transactions_to_create)
            if notifications_to_create:
                Notification.objects.bulk_create(notifications_to_create)

            admin_user = request.user if request.user.is_authenticated else None
            grant = MassRewardGrant.objects.create(
                admin=admin_user,
                title=title,
                message=message,
                gems_amount=gems_amount,
                budget_amount=budget_amount,
                teams_count=len(teams),
                target_type=target_type
            )

        return Response({
            'message': f'پاداش با موفقیت به {len(teams)} تیم اختصاص داده شد.',
            'grant': MassRewardGrantSerializer(grant).data,
            'teams_count': len(teams)
        }, status=status.HTTP_201_CREATED)

