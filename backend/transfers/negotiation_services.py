import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from django.db import transaction
from teams.models import Team, Player
from transfers.models import TransferOffer, TransferLog
from economy.services import process_atomic_wallet_update

def create_transfer_offer(sender_team_id, receiver_team_id, target_player_id, data):
    sender = Team.objects.get(id=sender_team_id)
    receiver = Team.objects.get(id=receiver_team_id)
    target_player = Player.objects.get(id=target_player_id, team=receiver)
    
    offer_type = data.get('offer_type', 'DIRECT_TRANSFER')
    cash_amount = Decimal(str(data.get('cash_amount', 0.00)))
    loan_duration = int(data.get('loan_duration_matches', 0))
    swap_player_ids = data.get('swap_players', [])
    parent_offer_id = data.get('parent_offer', None)
    
    with transaction.atomic():
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
            players = Player.objects.filter(id__in=swap_player_ids, team=sender)
            offer.swap_players.set(players)
            
        if parent_offer_id:
            parent = TransferOffer.objects.get(id=parent_offer_id)
            parent.status = 'COUNTERED'
            parent.save(update_fields=['status'])
            offer.parent_offer = parent
            offer.save()
            
            TransferLog.objects.create(
                event_type='COUNTER_OFFER',
                description=f"تیم {sender.name} یک پیشنهاد متقابل برای {target_player.name} ثبت کرد.",
                related_offer=offer
            )
        else:
            TransferLog.objects.create(
                event_type='OFFER_MADE',
                description=f"تیم {sender.name} پیشنهادی برای جذب {target_player.name} به تیم {receiver.name} ارسال کرد.",
                related_offer=offer
            )
            
    return {'success': True, 'offer_id': offer.id}

def accept_transfer_offer(offer_id, user_team_id):
    with transaction.atomic():
        offer = TransferOffer.objects.select_for_update().get(id=offer_id)
        if offer.receiver_team.id != user_team_id:
            return {'success': False, 'error': 'این پیشنهاد متعلق به تیم شما نیست.'}
        if offer.status != 'PENDING':
            return {'success': False, 'error': 'این پیشنهاد دیگر معتبر نیست.'}
            
        if offer.offer_type == 'DIRECT_TRANSFER' or offer.offer_type == 'SWAP':
            # Budget check
            if offer.sender_team.budget < offer.cash_amount:
                return {'success': False, 'error': 'تیم پیشنهاد دهنده بودجه کافی ندارد.'}
                
            # Perform transfer
            if offer.cash_amount > 0:
                process_atomic_wallet_update(offer.sender_team, -offer.cash_amount, 'TRANSFER_FEE', f"خرید {offer.target_player.name}")
                process_atomic_wallet_update(offer.receiver_team, offer.cash_amount, 'TRANSFER_FEE_RECEIVED', f"فروش {offer.target_player.name}")
                
            # Move target player
            target_p = offer.target_player
            target_p.team = offer.sender_team
            target_p.is_starting = False
            target_p.x_coord = 0
            target_p.y_coord = 0
            target_p.save()
            
            # Move swap players
            if offer.offer_type == 'SWAP':
                for sp in offer.swap_players.all():
                    sp.team = offer.receiver_team
                    sp.is_starting = False
                    sp.x_coord = 0
                    sp.y_coord = 0
                    sp.save()
                    
        elif offer.offer_type == 'LOAN':
            # Simple loan (we don't have active loan logic yet, just move for now or mark)
            if offer.sender_team.budget < offer.cash_amount:
                return {'success': False, 'error': 'تیم پیشنهاد دهنده بودجه کافی ندارد.'}
                
            if offer.cash_amount > 0:
                process_atomic_wallet_update(offer.sender_team, -offer.cash_amount, 'LOAN_FEE', f"قرض {offer.target_player.name}")
                process_atomic_wallet_update(offer.receiver_team, offer.cash_amount, 'LOAN_FEE_RECEIVED', f"انتقال قرضی {offer.target_player.name}")
                
            # Move target player
            target_p = offer.target_player
            target_p.team = offer.sender_team
            target_p.is_starting = False
            target_p.save()
            
        offer.status = 'ACCEPTED'
        offer.save(update_fields=['status'])
        
        TransferLog.objects.create(
            event_type='TRANSFER_FINALIZED',
            description=f"انتقال {offer.target_player.name} به تیم {offer.sender_team.name} نهایی شد.",
            related_offer=offer
        )
        return {'success': True}

def reject_transfer_offer(offer_id, user_team_id):
    with transaction.atomic():
        offer = TransferOffer.objects.get(id=offer_id)
        if offer.receiver_team.id != user_team_id:
            return {'success': False, 'error': 'Unauthorized'}
        if offer.status != 'PENDING':
            return {'success': False, 'error': 'Invalid status'}
            
        offer.status = 'REJECTED'
        offer.save(update_fields=['status'])
        
        TransferLog.objects.create(
            event_type='OFFER_REJECTED',
            description=f"پیشنهاد تیم {offer.sender_team.name} برای {offer.target_player.name} رد شد.",
            related_offer=offer
        )
        return {'success': True}

def release_player(player_id, user_team_id):
    with transaction.atomic():
        player = Player.objects.get(id=player_id, team__id=user_team_id)
        team = player.team
        
        # 20% of (wage * 50) as market value
        market_val = player.wage * Decimal('50.0')
        refund = market_val * Decimal('0.20')
        
        player.team = None
        player.is_starting = False
        player.save()
        
        if refund > 0:
            process_atomic_wallet_update(team, refund, 'PLAYER_RELEASE', f"آزادسازی {player.name}")
            
        TransferLog.objects.create(
            event_type='PLAYER_RELEASED',
            description=f"تیم {team.name} قرارداد {player.name} را فسخ کرد و {refund} دلار دریافت نمود."
        )
        return {'success': True, 'refund': float(refund)}
