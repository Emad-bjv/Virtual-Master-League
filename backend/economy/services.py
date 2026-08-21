import requests
import json
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from teams.models import Team
from .models import Transaction, StorePackage


def process_atomic_wallet_update(team_id, amount, currency: str = 'BUDGET', transaction_type: str = 'MANUAL_ADJUSTMENT', description: str = "") -> dict:
    """
    Atomically updates a team's budget or gems to prevent race conditions.
    Accepts both team ID (int) or Team instance.
    """
    with transaction.atomic():
        try:
            t_id = team_id.id if hasattr(team_id, 'id') else int(team_id)
            team = Team.objects.select_for_update().get(id=t_id)
            
            # Normalize Currency
            curr = 'GEMS' if str(currency).upper() == 'GEMS' else 'BUDGET'
            
            # Normalize Transaction Type to match model choices
            TYPE_MAP = {
                'TRANSFER_FEE': 'TRANSFER_BUY',
                'TRANSFER_FEE_RECEIVED': 'TRANSFER_SELL',
                'LOAN_FEE': 'LOAN_FEE',
                'LOAN_FEE_RECEIVED': 'LOAN_FEE_RECEIVED',
                'PLAYER_RELEASE': 'PLAYER_RELEASE',
                'MATCH_REWARD': 'MATCH_REWARD',
                'WAGE': 'WAGE',
                'FACILITY_UPGRADE': 'FACILITY_UPGRADE',
                'STORE_PURCHASE': 'STORE_PURCHASE',
                'GACHA_OPEN': 'GACHA_OPEN',
                'PLAYER_LEVEL_UP': 'PLAYER_LEVEL_UP',
            }
            tx_type = TYPE_MAP.get(transaction_type, transaction_type)
            valid_types = [c[0] for c in Transaction.TRANSACTION_TYPES]
            if tx_type not in valid_types:
                tx_type = 'MANUAL_ADJUSTMENT'
            
            if curr == 'GEMS':
                current_balance = int(team.gems or 0)
                int_amount = int(amount)
                if int_amount < 0 and current_balance + int_amount < 0:
                    return {'success': False, 'error': 'جم کافی نیست.'}
                team.gems = current_balance + int_amount
                team.save(update_fields=['gems'])
                new_balance = team.gems
            else:
                current_balance = Decimal(str(team.budget or '0.00'))
                dec_amount = Decimal(str(amount))
                if dec_amount < 0 and current_balance + dec_amount < 0:
                    return {'success': False, 'error': 'موجودی کافی نیست.'}
                team.budget = current_balance + dec_amount
                team.save(update_fields=['budget'])
                new_balance = team.budget
            
            # Record transaction
            txn = Transaction.objects.create(
                team=team,
                currency=curr,
                amount=Decimal(str(amount)),
                transaction_type=tx_type,
                status='SUCCESS',
                description=str(description)[:255]
            )
            
            return {
                'success': True,
                'new_balance': new_balance,
                'transaction_id': txn.id
            }
        except Team.DoesNotExist:
            return {'success': False, 'error': 'تیم یافت نشد.'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

def distribute_match_rewards(match) -> dict:
    from django.utils import timezone
    from datetime import timedelta
    from .formulas import calculate_match_reward, apply_weekly_soft_cap, calculate_match_gem_reward

    week_start = timezone.now() - timedelta(days=timezone.now().weekday())
    results = []

    for team, opponent_team, opponent_score, own_score in [
        (match.home_team, match.away_team, match.away_score, match.home_score),
        (match.away_team, match.home_team, match.home_score, match.away_score),
    ]:
        if not team:
            continue
        result = 'WIN' if own_score > opponent_score else ('DRAW' if own_score == opponent_score else 'LOSS')
        clean_sheet = opponent_score == 0
        raw = calculate_match_reward(team, result, own_score, clean_sheet)

        # Apply Stadium Multiplier for home matches (Ticket & Matchday Sponsor)
        if team == match.home_team and hasattr(team, 'facilities') and team.facilities:
            stadium_mult = Decimal(str(get_stadium_multiplier(team)))
            raw = (raw * stadium_mult).quantize(Decimal('0.01'))

        capped = apply_weekly_soft_cap(team, raw, week_start)

        # Dollar reward
        process_atomic_wallet_update(
            team_id=team.id, amount=capped, currency='BUDGET',
            transaction_type='MATCH_REWARD',
            description=f"پاداش مسابقه {match} — {('میزبان با بونوس استادیوم' if team == match.home_team else 'میهمان')} ({result})"
        )

        # Gem reward (Win & Underdog)
        gem_data = calculate_match_gem_reward(team, opponent_team, result)
        if gem_data['total_gems'] > 0:
            desc = f"پاداش جم برد بازی {match}"
            if gem_data['is_underdog']:
                desc += f" (شامل {gem_data['underdog_gems']} جم پاداش شگفتی‌سازی مقابل تیم قدرتمند)"
            process_atomic_wallet_update(
                team_id=team.id, amount=Decimal(str(gem_data['total_gems'])), currency='GEMS',
                transaction_type='UNDERDOG_BONUS' if gem_data['is_underdog'] else 'MATCH_REWARD',
                description=desc
            )

        results.append({
            'team': team.name,
            'raw': float(raw),
            'capped': float(capped),
            'gems_earned': gem_data['total_gems'],
            'is_underdog': gem_data['is_underdog']
        })

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
    curr_type = package.currency_type
    reward_amt = package.reward_amount or package.usd_amount
    txn = Transaction.objects.create(
        team=team,
        currency=curr_type,
        amount=reward_amt,
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
                if txn.currency == 'GEMS':
                    team.gems += int(txn.amount)
                    team.save(update_fields=['gems'])
                else:
                    team.budget += Decimal(str(txn.amount))
                    team.save(update_fields=['budget'])
                
                txn.status = 'SUCCESS'
                txn.zarinpal_ref_id = str(ref_id)
                txn.save(update_fields=['status', 'zarinpal_ref_id'])
                
            return {
                'success': True,
                'ref_id': ref_id,
                'new_budget': team.budget,
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
