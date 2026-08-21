import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from teams.models import Team, Player
from transfers.models import TransferOffer, TransferLog
from economy.services import process_atomic_wallet_update
from realtime.events import notify_admin
from notifications.services import create_notification

def create_transfer_offer(sender_team_id, receiver_team_id, target_player_id, data):
    try:
        sender = Team.objects.filter(id=sender_team_id).first()
        receiver = Team.objects.filter(id=receiver_team_id).first()
        if not sender:
            return {'success': False, 'error': 'تیم مبدأ (پیشنهاد دهنده) مشخص نیست یا یافت نشد.'}
        if not receiver:
            return {'success': False, 'error': 'تیم مقصد یافت نشد.'}
            
        if sender.id == receiver.id:
            return {'success': False, 'error': 'امکان ارسال پیشنهاد برای بازیکنان تیم خودتان وجود ندارد.'}

        target_player = Player.objects.filter(id=target_player_id).first()
        if not target_player:
            return {'success': False, 'error': 'بازیکن مورد نظر یافت نشد.'}
            
        seller = target_player.team
        if not seller or seller.id not in [sender.id, receiver.id]:
            return {'success': False, 'error': f'بازیکن در هیچ‌یک از دو تیم {sender.name} یا {receiver.name} حضور ندارد.'}
            
        if target_player.loan_owner_team_id is not None:
            return {'success': False, 'error': 'این بازیکن در حال حاضر به صورت قرضی در تیم فعلی حضور دارد و قابلیت فروش یا انتقال مجدد را ندارد.'}
        
        buyer = receiver if sender.id == seller.id else sender
        is_sender_seller = (sender.id == seller.id)

        offer_type = data.get('offer_type', 'DIRECT_TRANSFER')
        raw_cash = data.get('cash_amount', 0.00)
        try:
            cash_amount = Decimal(str(raw_cash or 0.00))
        except Exception:
            cash_amount = Decimal('0.00')
            
        # Ensure cash amount does not exceed max_digits in DB
        cash_amount = min(Decimal('9999999999.99'), max(Decimal('0.00'), cash_amount))
        
        # If sender is buyer, validate buyer's current budget
        if not is_sender_seller and cash_amount > buyer.budget:
            return {
                'success': False, 
                'error': f'بودجه باشگاه شما ({float(buyer.budget):,.0f} $) برای این پیشنهاد ({float(cash_amount):,.0f} $) کافی نیست.'
            }

        loan_duration = int(data.get('loan_duration_matches', 0) or 0)
        swap_player_ids = data.get('swap_players', [])
        
        if swap_player_ids:
            if Player.objects.filter(id__in=swap_player_ids, loan_owner_team__isnull=False).exists():
                return {'success': False, 'error': 'یکی از بازیکنان انتخاب شده برای معاوضه، بازیکن قرضی است و نمی‌تواند مجدداً معامله شود.'}
            
            # STRICT RULE: In all trades/counter-offers, swap players MUST belong to the Buyer!
            invalid_swaps = Player.objects.filter(id__in=swap_player_ids).exclude(team=buyer)
            if invalid_swaps.exists():
                return {
                    'success': False,
                    'error': f'تمام بازیکنان معاوضه‌ای باید متعلق به تیم خریدار ({buyer.name}) باشند.'
                }
                
        parent_offer_id = data.get('parent_offer', None)
        
        with transaction.atomic():
            # Automatically supersede any previous pending offers between these two teams for this player
            TransferOffer.objects.filter(
                status='PENDING',
                target_player=target_player
            ).filter(
                (Q(sender_team=sender, receiver_team=receiver) | Q(sender_team=receiver, receiver_team=sender))
            ).update(status='SUPERSEDED')

            offer = TransferOffer.objects.create(
                sender_team=sender,
                receiver_team=receiver,
                target_player=target_player,
                offer_type=offer_type,
                cash_amount=cash_amount,
                loan_duration_matches=loan_duration,
                status='PENDING'
            )
            if swap_player_ids:
                players = Player.objects.filter(id__in=swap_player_ids, team=buyer)
                offer.swap_players.set(players)
                
            if parent_offer_id:
                parent = TransferOffer.objects.filter(id=parent_offer_id).first()
                if parent:
                    parent.status = 'COUNTERED'
                    parent.save(update_fields=['status'])
                    offer.parent_offer = parent
                    offer.save()
                
                swap_names = ""
                if swap_player_ids and offer.swap_players.exists():
                    swap_names = " + معاوضه: " + "، ".join([p.name for p in offer.swap_players.all()])
                desc = f"تیم {sender.name} یک پیشنهاد متقابل (مبلغ: {float(cash_amount):,.0f} ${swap_names}) برای {target_player.name} به تیم {receiver.name} ارسال کرد."
                TransferLog.objects.create(
                    event_type='COUNTER_OFFER',
                    description=desc,
                    related_offer=offer
                )
                notify_admin(f"🔄 پیشنهاد متقابل: تیم {sender.name} پیشنهاد جدیدی به ارزش ${float(cash_amount):,.0f}{swap_names} برای {target_player.name} به {receiver.name} فرستاد.")
                create_notification(
                    team=receiver,
                    category='TRANSFER',
                    title='🔄 پیشنهاد متقابل در مذاکرات',
                    message=f"باشگاه {sender.name} شرایط و پیشنهاد جدیدی به مبلغ ${float(cash_amount):,.0f}{swap_names} برای بازیکن {target_player.name} به شما ارسال کرد."
                )
            else:
                swap_names = ""
                if swap_player_ids and offer.swap_players.exists():
                    swap_names = " + معاوضه: " + "، ".join([p.name for p in offer.swap_players.all()])
                desc = f"تیم {sender.name} پیشنهادی به مبلغ {float(cash_amount):,.0f} ${swap_names} برای جذب {target_player.name} به تیم {receiver.name} ارسال کرد."
                TransferLog.objects.create(
                    event_type='OFFER_MADE',
                    description=desc,
                    related_offer=offer
                )
                notify_admin(f"📢 پیشنهاد جدید: تیم {sender.name} پیشنهاد رسمی به مبلغ ${float(cash_amount):,.0f}{swap_names} برای {target_player.name} به {receiver.name} ارسال کرد.")
                create_notification(
                    team=receiver,
                    category='TRANSFER',
                    title='📩 پیشنهاد رسمی خرید بازیکن',
                    message=f"باشگاه {sender.name} پیشنهادی رسمی به مبلغ ${float(cash_amount):,.0f}{swap_names} برای جذب {target_player.name} به باشگاه شما فرستاده است."
                )
                
        return {'success': True, 'offer_id': offer.id}
    except Exception as e:
        return {'success': False, 'error': f'خطا در پردازش پیشنهاد: {str(e)}'}

def accept_transfer_offer(offer_id, user_team_id):
    try:
        with transaction.atomic():
            offer = TransferOffer.objects.select_for_update().filter(id=offer_id).first()
            if not offer:
                return {'success': False, 'error': 'پیشنهاد یافت نشد.'}
            if offer.receiver_team_id != user_team_id:
                return {'success': False, 'error': 'این پیشنهاد متعلق به تیم شما برای تصمیم‌گیری نیست.'}
            if offer.status != 'PENDING':
                return {'success': False, 'error': f'این پیشنهاد دیگر در وضعیت بررسی نیست (وضعیت: {offer.get_status_display()}).'}
                
            target_p = offer.target_player
            seller = target_p.team
            if not seller or seller.id not in [offer.sender_team_id, offer.receiver_team_id]:
                return {'success': False, 'error': 'تیم مالک بازیکن هدف مشخص نیست.'}
            buyer = offer.sender_team if offer.receiver_team_id == seller.id else offer.receiver_team

            if offer.offer_type in ['DIRECT_TRANSFER', 'SWAP']:
                # Budget check for buyer
                if buyer.budget < offer.cash_amount:
                    return {'success': False, 'error': f'تیم {buyer.name} بودجه کافی برای پرداخت مبلغ معامله ({float(offer.cash_amount):,.0f} $) ندارد.'}
                    
                # Perform atomic wallet transfer
                if offer.cash_amount > 0:
                    res_b = process_atomic_wallet_update(buyer.id, -offer.cash_amount, 'BUDGET', 'TRANSFER_BUY', f"خرید {target_p.name}")
                    if not res_b.get('success'):
                        return {'success': False, 'error': res_b.get('error', 'خطا در کسر بودجه خریدار')}
                    res_s = process_atomic_wallet_update(seller.id, offer.cash_amount, 'BUDGET', 'TRANSFER_SELL', f"فروش {target_p.name}")
                    if not res_s.get('success'):
                        return {'success': False, 'error': res_s.get('error', 'خطا در افزایش بودجه فروشنده')}
                    
                # Move target player to buyer
                target_p.team = buyer
                target_p.loan_owner_team = None
                target_p.loan_matches_left = 0
                target_p.is_starting = False
                target_p.x_coord = 0.0
                target_p.y_coord = 0.0
                target_p.save()
                
                # Move swap players: all swap players belong to buyer and move to seller
                if offer.offer_type == 'SWAP':
                    for sp in offer.swap_players.all():
                        sp.team = seller
                        sp.loan_owner_team = None
                        sp.loan_matches_left = 0
                        sp.is_starting = False
                        sp.x_coord = 0.0
                        sp.y_coord = 0.0
                        sp.save()
                        
            elif offer.offer_type == 'LOAN':
                if buyer.budget < offer.cash_amount:
                    return {'success': False, 'error': f'تیم {buyer.name} بودجه کافی برای مبلغ قرضی ندارد.'}
                    
                if offer.cash_amount > 0:
                    res_b = process_atomic_wallet_update(buyer.id, -offer.cash_amount, 'BUDGET', 'LOAN_FEE', f"قرض {target_p.name}")
                    if not res_b.get('success'):
                        return {'success': False, 'error': res_b.get('error', 'خطا در کسر بودجه قرضی')}
                    res_s = process_atomic_wallet_update(seller.id, offer.cash_amount, 'BUDGET', 'LOAN_FEE_RECEIVED', f"انتقال قرضی {target_p.name}")
                    if not res_s.get('success'):
                        return {'success': False, 'error': res_s.get('error', 'خطا در افزایش بودجه قرض‌دهنده')}
                    
                # Move target player for loan
                target_p.team = buyer
                target_p.loan_owner_team = seller
                target_p.loan_matches_left = offer.loan_duration_matches
                target_p.is_starting = False
                target_p.x_coord = 0.0
                target_p.y_coord = 0.0
                target_p.save()
                
                # Move swap players for mutual loan (Loan Swap)
                for sp in offer.swap_players.all():
                    if sp.team_id == buyer.id:
                        sp.team = seller
                        sp.loan_owner_team = buyer
                    elif sp.team_id == seller.id:
                        sp.team = buyer
                        sp.loan_owner_team = seller
                    sp.loan_matches_left = offer.loan_duration_matches
                    sp.is_starting = False
                    sp.x_coord = 0.0
                    sp.y_coord = 0.0
                    sp.save()
                
            offer.status = 'ACCEPTED'
            offer.save(update_fields=['status'])
            
            # Cancel all other pending offers on this player across the league
            TransferOffer.objects.filter(
                target_player=offer.target_player,
                status='PENDING'
            ).exclude(id=offer.id).update(status='CANCELLED')
            
            # Ensure both clubs maintain 11 starters on the pitch
            ensure_team_starting_eleven(seller)
            ensure_team_starting_eleven(buyer)
            
            deal_desc = f"انتقال رسمی: {offer.target_player.name} با مبلغ {float(offer.cash_amount):,.0f} $ از {seller.name} به تیم {buyer.name} پیوست."
            TransferLog.objects.create(
                event_type='TRANSFER_FINALIZED',
                description=deal_desc,
                related_offer=offer
            )
            notify_admin(f"🚨 توافق و انتقال رسمی: {offer.target_player.name} با مبلغ ${float(offer.cash_amount):,.0f} به {buyer.name} پیوست!")
            
            # In-app notifications for both Buyer and Seller
            create_notification(
                team=buyer,
                category='TRANSFER',
                title='🎉 توافق نهایی و انتقال بازیکن',
                message=f"انتقال رسمی با موفقیت نهایی شد: {offer.target_player.name} با مبلغ ${float(offer.cash_amount):,.0f} به باشگاه شما پیوست."
            )
            create_notification(
                team=seller,
                category='TRANSFER',
                title='💼 انتقال رسمی بازیکن به تیم خریدار',
                message=f"انتقال رسمی: بازیکن {offer.target_player.name} با مبلغ ${float(offer.cash_amount):,.0f} به تیم {buyer.name} واگذار گردید."
            )
            return {'success': True}
    except Exception as e:
        return {'success': False, 'error': f'خطا در نهایی‌سازی انتقال: {str(e)}'}

def ensure_team_starting_eleven(team):
    """
    Ensures a team maintains 11 starting players if available in the squad.
    If starters < 11, promotes top bench players to is_starting=True.
    """
    if not team:
        return
    current_starters = team.players.filter(is_starting=True).count()
    if current_starters < 11:
        needed = 11 - current_starters
        bench_players = list(team.players.filter(is_starting=False).order_by('-overall')[:needed])
        for bp in bench_players:
            bp.is_starting = True
            bp.save(update_fields=['is_starting'])
    team.update_star_rating(save=True)

def reject_transfer_offer(offer_id, user_team_id):
    try:
        with transaction.atomic():
            offer = TransferOffer.objects.filter(id=offer_id).first()
            if not offer:
                return {'success': False, 'error': 'پیشنهاد یافت نشد.'}
            if offer.status != 'PENDING':
                return {'success': False, 'error': 'این پیشنهاد دیگر معتبر نیست.'}
                
            is_receiver = (offer.receiver_team_id == user_team_id)
            is_sender = (offer.sender_team_id == user_team_id)
            
            if not is_receiver and not is_sender:
                return {'success': False, 'error': 'شما دسترسی به این پیشنهاد را ندارید.'}
                
            if is_receiver:
                offer.status = 'REJECTED'
                log_desc = f"پیشنهاد تیم {offer.sender_team.name} برای {offer.target_player.name} توسط تیم {offer.receiver_team.name} رد شد."
                event_type = 'OFFER_REJECTED'
                notify_admin(f"❌ رد پیشنهاد: پیشنهاد انتقال {offer.target_player.name} توسط {offer.receiver_team.name} رد شد.")
                create_notification(
                    team=offer.sender_team,
                    category='TRANSFER',
                    title='❌ رد پیشنهاد انتقال',
                    message=f"باشگاه {offer.receiver_team.name} پیشنهاد شما برای جذب بازیکن {offer.target_player.name} را رد کرد."
                )
            else:
                offer.status = 'CANCELLED'
                log_desc = f"پیشنهاد ثبت شده برای {offer.target_player.name} توسط تیم {offer.sender_team.name} لغو شد."
                event_type = 'OFFER_CANCELLED'
                notify_admin(f"🚫 لغو پیشنهاد: پیشنهاد ثبت‌شده برای {offer.target_player.name} توسط {offer.sender_team.name} لغو گردید.")
                
            offer.save(update_fields=['status'])
            
            TransferLog.objects.create(
                event_type=event_type,
                description=log_desc,
                related_offer=offer
            )
            return {'success': True, 'status': offer.status}
    except Exception as e:
        return {'success': False, 'error': f'خطا در لغو یا رد پیشنهاد: {str(e)}'}

def release_player(player_id, user_team_id):
    with transaction.atomic():
        player = Player.objects.get(id=player_id, team__id=user_team_id)
        if player.loan_owner_team is not None:
            raise ValueError("این بازیکن به صورت قرضی در تیم شما حضور دارد و قابلیت آزادسازی یا فسخ یکطرفه ندارد.")
        team = player.team
        
        # 20% of (wage * 50) as market value
        market_val = player.wage * Decimal('50.0')
        refund = market_val * Decimal('0.20')
        
        player.team = None
        player.is_starting = False
        player.save()
        
        # Ensure team retains 11 starting players if available
        ensure_team_starting_eleven(team)
        
        if refund > 0:
            process_atomic_wallet_update(team.id, refund, 'BUDGET', 'PLAYER_RELEASE', f"آزادسازی {player.name}")
            
        release_desc = f"تیم {team.name} قرارداد {player.name} را فسخ کرد و {float(refund):,.0f} دلار دریافت نمود."
        TransferLog.objects.create(
            event_type='PLAYER_RELEASED',
            description=release_desc
        )
        notify_admin(f"📄 فسخ قرارداد: تیم {team.name} قرارداد {player.name} را فسخ کرد و بازیکن آزاد شد.")
        create_notification(
            team=team,
            category='TRANSFER',
            title='📄 فسخ قرارداد بازیکن',
            message=f"قرارداد بازیکن {player.name} فسخ گردید و مبلغ ${float(refund):,.0f} به عنوان غرامت/بازگشت مالی به بودجه باشگاه واریز شد."
        )
        return {'success': True, 'refund': float(refund)}
