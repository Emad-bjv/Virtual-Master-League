from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum
from teams.models import Team, Player
from economy.services import process_atomic_wallet_update
from .models import TransferListing, TransferBid, TransferHistory, TransferLog
from realtime.events import notify_admin


def check_wage_cap_compliance(team: Team, incoming_player: Player) -> dict:
    """
    Checks if adding an incoming player would exceed the team's wage cap.

    Returns:
        {'compliant': True} if the addition is allowed.
        {'compliant': False, 'error': '...'} if it would exceed the cap.
    """
    current_total_wage = team.players.aggregate(total=Sum('wage'))['total'] or Decimal('0.00')
    current_total_wage = Decimal(str(current_total_wage))
    player_wage = Decimal(str(incoming_player.wage or '0.00'))
    projected_total = current_total_wage + player_wage
    wage_cap = Decimal(str(team.wage_cap or '10000.00'))
    if projected_total > wage_cap:
        return {
            'compliant': False,
            'error': (
                f"افزودن این بازیکن از سقف دستمزد تیم عبور می‌کند. "
                f"سقف دستمزد: {team.wage_cap}, "
                f"دستمزد فعلی تیم: {current_total_wage}, "
                f"دستمزد این بازیکن: {incoming_player.wage}."
            )
        }
    return {'compliant': True}


def list_player_for_sale(team_id: int, player_id: int, price_usd: Decimal, listing_type: str = 'FIXED_PRICE') -> dict:
    """
    Lists a player on the transfer market.
    """
    try:
        team = Team.objects.get(id=team_id)
        player = Player.objects.get(id=player_id, team=team)
    except Team.DoesNotExist:
        return {'success': False, 'error': 'تیم یافت نشد.'}
    except Player.DoesNotExist:
        return {'success': False, 'error': 'بازیکن یافت نشد یا متعلق به این تیم نیست.'}

    if TransferListing.objects.filter(player=player, status='ACTIVE').exists():
        return {'success': False, 'error': 'این بازیکن در حال حاضر آگهی فعال در نقل‌وانتقالات دارد.'}

    listing = TransferListing.objects.create(
        player=player,
        seller_team=team,
        listing_type=listing_type,
        price_usd=price_usd,
        highest_bid=price_usd if listing_type == 'AUCTION' else Decimal('0.00'),
        status='ACTIVE'
    )

    return {
        'success': True,
        'listing_id': listing.id,
        'message': f"بازیکن {player.name} با موفقیت در بازار ثبت شد."
    }


def buy_player_direct(buyer_team_id: int, listing_id: int) -> dict:
    """
    Direct purchase of a fixed-price listing with atomic locking and 25-player cap check.
    """
    with transaction.atomic():
        try:
            listing = TransferListing.objects.select_for_update().get(id=listing_id, status='ACTIVE')
            buyer = Team.objects.select_for_update().get(id=buyer_team_id)
            seller = Team.objects.select_for_update().get(id=listing.seller_team.id)
        except TransferListing.DoesNotExist:
            return {'success': False, 'error': 'آگهی یافت نشد یا منقضی/فروخته شده است.'}
        except Team.DoesNotExist:
            return {'success': False, 'error': 'تیم خریدار یا فروشنده یافت نشد.'}

        if listing.listing_type != 'FIXED_PRICE':
            return {'success': False, 'error': 'این آگهی از نوع قیمت مقطوع نیست و باید در مزایده شرکت کنید.'}

        if buyer.id == seller.id:
            return {'success': False, 'error': 'نمی‌توانید بازیکن خودتان را بخرید.'}

        if buyer.manager is None:
            return {'success': False, 'error': 'تیم بدون مربی (سرپرستی) مجاز به خرید یا خرج بودجه نیست.'}

        # Check buyer roster limit (dynamic 25-32 players based on training camp)
        max_squad = buyer.max_squad_size
        if buyer.players.count() >= max_squad:
            return {
                'success': False,
                'error': f'تیم شما حداکثر ظرفیت مجاز ({max_squad} بازیکن) را دارد. با ارتقای کمپ تمرینی می‌توانید ظرفیت را تا ۳۲ نفر افزایش دهید.'
            }

        # Check wage cap compliance
        wage_check = check_wage_cap_compliance(buyer, listing.player)
        if not wage_check['compliant']:
            return {'success': False, 'error': wage_check['error']}

        price = listing.price_usd

        # Deduct budget from buyer
        deduct_res = process_atomic_wallet_update(
            team_id=buyer.id,
            amount=-price,
            currency='BUDGET',
            transaction_type='WITHDRAW',
            description=f"خرید مستقیم بازیکن {listing.player.name}"
        )
        if not deduct_res['success']:
            return {'success': False, 'error': f"خرید ناموفق: {deduct_res.get('error')}"}

        # Add budget to seller (with 5% transfer tax)
        tax_rate = Decimal('0.05')
        net_seller_amount = price * (Decimal('1.00') - tax_rate)

        process_atomic_wallet_update(
            team_id=seller.id,
            amount=net_seller_amount,
            currency='BUDGET',
            transaction_type='DEPOSIT',
            description=f"فروش بازیکن {listing.player.name} (با کسر ۵٪ مالیات)"
        )

        # Transfer player ownership
        player = listing.player
        player.team = buyer
        player.save(update_fields=['team'])

        # Update listing status
        listing.status = 'SOLD'
        listing.highest_bidder = buyer
        listing.highest_bid = price
        listing.save(update_fields=['status', 'highest_bidder', 'highest_bid'])

        # Log history
        history = TransferHistory.objects.create(
            player=player,
            seller_team=seller,
            buyer_team=buyer,
            price_usd=price,
            transfer_type='FIXED_PRICE'
        )

        TransferLog.objects.create(
            event_type='TRANSFER_FINALIZED',
            description=f"خرید مستقیم از مارکت: {player.name} با مبلغ {float(price):,.0f} $ از {seller.name} به تیم {buyer.name} پیوست.",
            related_listing=listing
        )
        notify_admin(f"🚨 خرید مستقیم نقل‌وانتقالات: {player.name} با پرداخت ${float(price):,.0f} توسط تیم {buyer.name} از مارکت جذب شد.")

        return {
            'success': True,
            'player_name': player.name,
            'price_paid': price,
            'buyer_new_budget': buyer.budget,
            'history_id': history.id
        }


def place_bid(bidder_team_id: int, listing_id: int, bid_amount: Decimal) -> dict:
    """
    Places a bid on an auction listing.
    """
    with transaction.atomic():
        try:
            listing = TransferListing.objects.select_for_update().get(id=listing_id, status='ACTIVE')
            bidder = Team.objects.select_for_update().get(id=bidder_team_id)
        except TransferListing.DoesNotExist:
            return {'success': False, 'error': 'آگهی یافت نشد یا فعال نیست.'}
        except Team.DoesNotExist:
            return {'success': False, 'error': 'تیم یافت نشد.'}

        if listing.listing_type != 'AUCTION':
            return {'success': False, 'error': 'این آگهی مزایده نیست.'}

        if listing.seller_team.id == bidder.id:
            return {'success': False, 'error': 'نمی‌توانید روی بازیکن خودتان پیشنهاد دهید.'}

        if bidder.manager is None:
            return {'success': False, 'error': 'تیم بدون مربی (سرپرستی) مجاز به پیشنهاد قیمت نیست.'}

        if bidder.budget < bid_amount:
            return {'success': False, 'error': 'موجودی شما کمتر از مبلغ پیشنهاد است.'}

        min_required = listing.highest_bid if listing.highest_bid > 0 else listing.price_usd
        if bid_amount <= min_required:
            return {'success': False, 'error': f'مبلغ پیشنهاد باید بیشتر از {min_required} دلار باشد.'}

        # Create Bid record
        bid = TransferBid.objects.create(
            listing=listing,
            bidder_team=bidder,
            amount_usd=bid_amount
        )

        # Update listing
        listing.highest_bid = bid_amount
        listing.highest_bidder = bidder
        listing.save(update_fields=['highest_bid', 'highest_bidder'])

        return {
            'success': True,
            'bid_id': bid.id,
            'highest_bid': bid_amount,
            'highest_bidder': bidder.name
        }


def finalize_auction(listing_id: int) -> dict:
    """
    Finalizes an auction, transferring the player to the highest bidder.
    """
    with transaction.atomic():
        try:
            listing = TransferListing.objects.select_for_update().get(id=listing_id, status='ACTIVE')
        except TransferListing.DoesNotExist:
            return {'success': False, 'error': 'آگهی فعال مزایده یافت نشد.'}

        if listing.listing_type != 'AUCTION':
            return {'success': False, 'error': 'این آگهی مزایده نیست.'}

        buyer = listing.highest_bidder
        seller = listing.seller_team

        if not buyer:
            listing.status = 'EXPIRED'
            listing.save(update_fields=['status'])
            return {'success': True, 'message': 'مزایده بدون پیشنهاد دهنده منقضی شد.'}

        max_squad = buyer.max_squad_size
        if buyer.players.count() >= max_squad:
            listing.status = 'EXPIRED'
            listing.save(update_fields=['status'])
            return {'success': False, 'error': f'تیم خریدار به حداکثر ظرفیت ({max_squad} بازیکن) رسیده است. مزایده لغو شد.'}

        # Check wage cap compliance
        wage_check = check_wage_cap_compliance(buyer, listing.player)
        if not wage_check['compliant']:
            listing.status = 'EXPIRED'
            listing.save(update_fields=['status'])
            return {'success': False, 'error': wage_check['error']}

        price = listing.highest_bid

        # Deduct from buyer
        deduct_res = process_atomic_wallet_update(
            team_id=buyer.id,
            amount=-price,
            currency='BUDGET',
            transaction_type='WITHDRAW',
            description=f"برنده مزایده بازیکن {listing.player.name}"
        )
        if not deduct_res['success']:
            listing.status = 'EXPIRED'
            listing.save(update_fields=['status'])
            return {'success': False, 'error': f"موجودی برنده مزایده ناکافی بود: {deduct_res.get('error')}"}

        # Add to seller (5% tax)
        tax_rate = Decimal('0.05')
        net_seller_amount = price * (Decimal('1.00') - tax_rate)

        process_atomic_wallet_update(
            team_id=seller.id,
            amount=net_seller_amount,
            currency='BUDGET',
            transaction_type='DEPOSIT',
            description=f"فروش مزایده‌ای بازیکن {listing.player.name} (با کسر ۵٪ مالیات)"
        )

        player = listing.player
        player.team = buyer
        player.save(update_fields=['team'])

        listing.status = 'SOLD'
        listing.save(update_fields=['status'])

        TransferHistory.objects.create(
            player=player,
            seller_team=seller,
            buyer_team=buyer,
            price_usd=price,
            transfer_type='AUCTION'
        )

        TransferLog.objects.create(
            event_type='TRANSFER_FINALIZED',
            description=f"برنده مزایده مارکت: {player.name} با بالاترین پیشنهاد {float(price):,.0f} $ توسط {buyer.name} از {seller.name} خریداری شد.",
            related_listing=listing
        )
        notify_admin(f"🔨 پایان مزایده: بازیکن {player.name} با مبلغ نهایی ${float(price):,.0f} به {buyer.name} واگذار گردید.")

        return {
            'success': True,
            'winner': buyer.name,
            'final_price': price
        }


def auto_release_overflow_players(team_id: int) -> dict:
    """
    Automatically releases players to free agency if team size exceeds 25 players.
    Releases lowest overall players first.
    """
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        return {'success': False, 'error': 'تیم یافت نشد.'}

    players = team.players.all()
    total_count = players.count()

    if total_count <= 25:
        return {'success': True, 'released_count': 0, 'message': 'تیم در حد مجاز (۲۵ یا کمتر) است.'}

    sorted_players = sorted(
        list(players),
        key=lambda p: p.overall + (p.potential_ovr / 2.0) - (p.age * 2.0)
    )

    overflow_count = total_count - 25
    released_players = sorted_players[:overflow_count]

    released_names = []
    with transaction.atomic():
        for player in released_players:
            released_names.append(player.name)
            player.team = None
            player.save(update_fields=['team'])

            TransferHistory.objects.create(
                player=player,
                seller_team=team,
                buyer_team=None,
                price_usd=Decimal('0.00'),
                transfer_type='AUTO_RELEASE'
            )

    return {
        'success': True,
        'released_count': overflow_count,
        'released_players': released_names,
        'message': f"{overflow_count} بازیکن مازاد به لیست آزاد انتقال یافتند."
    }
