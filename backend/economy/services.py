import requests
import json
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from teams.models import Team
from .models import Transaction, StorePackage


def process_atomic_wallet_update(team_id: int, amount: Decimal, currency: str, transaction_type: str, description: str = "") -> dict:
    """
    Atomically updates a team's budget or gems to prevent race conditions.
    """
    with transaction.atomic():
        try:
            # select_for_update locks the row until the transaction completes
            team = Team.objects.select_for_update().get(id=team_id)
            
            # Identify which field we are modifying
            field = 'budget' if currency == 'BUDGET' else 'gems'
            current_balance = getattr(team, field)
            
            # Check for sufficient funds if it's a withdrawal
            if amount < 0 and current_balance + amount < 0:
                error_msg = 'موجودی کافی نیست.' if currency == 'BUDGET' else 'جم کافی نیست.'
                return {'success': False, 'error': error_msg}
                
            # Update balance
            new_balance = current_balance + amount
            setattr(team, field, new_balance)
            team.save(update_fields=[field])
            
            # Record transaction
            txn = Transaction.objects.create(
                team=team,
                currency=currency,
                amount=amount,
                transaction_type=transaction_type,
                status='SUCCESS',
                description=description
            )
            
            return {
                'success': True,
                'new_balance': getattr(team, field),
                'transaction_id': txn.id
            }
        except Team.DoesNotExist:
            return {'success': False, 'error': 'تیم یافت نشد.'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

def distribute_match_rewards(match) -> dict:
    from django.utils import timezone
    from datetime import timedelta
    from .formulas import calculate_match_reward, apply_weekly_soft_cap

    week_start = timezone.now() - timedelta(days=timezone.now().weekday())
    results = []

    for team, opponent_score, own_score in [
        (match.home_team, match.away_score, match.home_score),
        (match.away_team, match.home_score, match.away_score),
    ]:
        if not team:
            continue
        result = 'WIN' if own_score > opponent_score else ('DRAW' if own_score == opponent_score else 'LOSS')
        clean_sheet = opponent_score == 0
        raw = calculate_match_reward(team, result, own_score, clean_sheet)
        capped = apply_weekly_soft_cap(team, raw, week_start)

        process_atomic_wallet_update(
            team_id=team.id, amount=capped, currency='BUDGET',
            transaction_type='MATCH_REWARD',
            description=f"پاداش بازی {match} — نتیجه: {result}"
        )
        results.append({'team': team.name, 'raw': float(raw), 'capped': float(capped)})

    return {'match_id': match.id, 'rewards': results}


# ──────────────────────────────────────────────
# ZARINPAL INTEGRATION
# ──────────────────────────────────────────────

if getattr(settings, 'ZARINPAL_SANDBOX', False):
    ZP_API_REQUEST = "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
    ZP_API_VERIFY = "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
    ZP_API_STARTPAY = "https://sandbox.zarinpal.com/pg/StartPay/{authority}"
else:
    ZP_API_REQUEST = "https://api.zarinpal.com/pg/v4/payment/request.json"
    ZP_API_VERIFY = "https://api.zarinpal.com/pg/v4/payment/verify.json"
    ZP_API_STARTPAY = "https://www.zarinpal.com/pg/StartPay/{authority}"

MERCHANT_ID = getattr(settings, 'ZARINPAL_MERCHANT_ID', '00000000-0000-0000-0000-000000000000')

def request_zarinpal_payment(team: Team, package: StorePackage, callback_url: str) -> dict:
    """
    Initiate a payment request to ZarinPal.
    """
    # Create PENDING transaction
    txn = Transaction.objects.create(
        team=team,
        currency='GEMS',
        amount=package.usd_amount,  # Now represents gems amount
        amount_irr=package.price_irr,
        transaction_type='STORE_PURCHASE',
        status='PENDING',
        description=f"خرید بسته {package.name}"
    )

    req_data = {
        "merchant_id": MERCHANT_ID,
        "amount": package.price_irr * 10, # Zarinpal works with Rials (Toman * 10)
        "callback_url": f"{callback_url}?txn_id={txn.id}",
        "description": txn.description,
        "metadata": {"email": getattr(team.manager, 'email', 'info@vml.com')}
    }
    
    req_header = {"accept": "application/json", "content-type": "application/json"}
    
    try:
        req = requests.post(url=ZP_API_REQUEST, data=json.dumps(req_data), headers=req_header)
        if len(req.text) == 0:
             return {'success': False, 'error': 'پاسخی از زرین‌پال دریافت نشد.'}
             
        response = req.json()
        
        if 'data' in response and response['data'].get('code') == 100:
            authority = response['data']['authority']
            txn.zarinpal_authority = authority
            txn.save(update_fields=['zarinpal_authority'])
            
            return {
                'success': True,
                'payment_url': ZP_API_STARTPAY.format(authority=authority),
                'transaction_id': txn.id
            }
        else:
            txn.status = 'FAILED'
            txn.description += f" | خطا در ایجاد تراکنش: {response.get('errors')}"
            txn.save(update_fields=['status', 'description'])
            return {'success': False, 'error': str(response.get('errors'))}
            
    except requests.exceptions.RequestException as e:
        return {'success': False, 'error': f"خطای ارتباط با درگاه: {str(e)}"}


def verify_zarinpal_payment(authority: str, txn_id: int) -> dict:
    """
    Verify a payment from ZarinPal and atomically fund the wallet.
    """
    try:
        txn = Transaction.objects.get(id=txn_id, zarinpal_authority=authority)
    except Transaction.DoesNotExist:
        return {'success': False, 'error': 'تراکنش یافت نشد یا Authority نامعتبر است.'}
        
    if txn.status != 'PENDING':
        return {'success': False, 'error': 'این تراکنش قبلا پردازش شده است.'}

    req_data = {
        "merchant_id": MERCHANT_ID,
        "amount": txn.amount_irr * 10, # Convert Toman to Rial
        "authority": authority
    }
    req_header = {"accept": "application/json", "content-type": "application/json"}
    
    try:
        req = requests.post(url=ZP_API_VERIFY, data=json.dumps(req_data), headers=req_header)
        if len(req.text) == 0:
             return {'success': False, 'error': 'پاسخی از درگاه دریافت نشد.'}
             
        response = req.json()
        
        if 'data' in response and response['data'].get('code') in [100, 101]:
            ref_id = response['data']['ref_id']
            
            # Payment successful, update atomically
            with transaction.atomic():
                team = Team.objects.select_for_update().get(id=txn.team_id)
                team.gems += txn.amount
                team.save(update_fields=['gems'])
                
                txn.status = 'SUCCESS'
                txn.zarinpal_ref_id = str(ref_id)
                txn.save(update_fields=['status', 'zarinpal_ref_id'])
                
            return {
                'success': True,
                'ref_id': ref_id,
                'new_gems': team.gems
            }
        else:
            txn.status = 'FAILED'
            txn.save(update_fields=['status'])
            return {'success': False, 'error': response.get('errors', 'پرداخت ناموفق بود.')}
            
    except requests.exceptions.RequestException as e:
        return {'success': False, 'error': f"خطای ارتباط با درگاه: {str(e)}"}

# ──────────────────────────────────────────────
# CLUB FACILITIES MULTIPLIERS (20-LEVEL)
# ──────────────────────────────────────────────

def get_stadium_multiplier(club) -> float:
    from teams.models import ClubFacilities
    level = club.facilities.stadium_level if hasattr(club, 'facilities') and club.facilities else 1
    return 1.0 + ClubFacilities.scaled_effect(level, 0.40)

def get_stadium_popularity_bonus(club) -> float:
    from teams.models import ClubFacilities
    level = club.facilities.stadium_level if hasattr(club, 'facilities') and club.facilities else 1
    return 1.0 + ClubFacilities.scaled_effect(level, 0.20)

def get_morale_loss_multiplier(club) -> float:
    from teams.models import ClubFacilities
    level = club.facilities.psychology_level if hasattr(club, 'facilities') and club.facilities else 1
    return 1.0 - ClubFacilities.scaled_effect(level, 0.24)

def get_unhappiness_threshold_bonus(club) -> int:
    from teams.models import ClubFacilities
    level = club.facilities.psychology_level if hasattr(club, 'facilities') and club.facilities else 1
    return int(round(ClubFacilities.scaled_effect(level, 4.0)))

def get_popularity_loss_multiplier(club) -> float:
    from teams.models import ClubFacilities
    level = club.facilities.media_level if hasattr(club, 'facilities') and club.facilities else 1
    return 1.0 - ClubFacilities.scaled_effect(level, 0.20)

def calculate_weekly_sponsor_income(club) -> float:
    from teams.models import ClubFacilities
    level = club.facilities.media_level if hasattr(club, 'facilities') and club.facilities else 1
    popularity = getattr(club, 'popularity', 100.0)
    return float(ClubFacilities.scaled_effect(level, 1000.0) * (popularity / 100.0))
