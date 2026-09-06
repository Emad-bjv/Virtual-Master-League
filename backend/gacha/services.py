import random
from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from teams.models import Team, Player
from economy.services import process_atomic_wallet_update
from .models import Pack, PackPlayer, PackOpeningSession

POSITION_POOL = ['GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'LMF', 'RMF', 'AMF', 'LWF', 'RWF', 'SS', 'CF']

RANDOM_FIRST_NAMES = [
    "Cristiano", "Lionel", "Kylian", "Erling", "Jude", "Vinicius", "Kevin",
    "Mohamed", "Lamine", "Pedri", "Bukayo", "Florian", "Jamal", "Rodri",
    "Federico", "Bruno", "Antoine", "Harry", "Lautaro", "Robert"
]

RANDOM_LAST_NAMES = [
    "Silva", "Santos", "Fernandes", "Garcia", "Martinez", "Lopez", "Yamal",
    "Haaland", "Mbappe", "Bellingham", "Junior", "De Bruyne", "Salah",
    "Musiala", "Wirtz", "Valverde", "Kane", "Lewandowski", "Modric"
]


def generate_random_player(rarity: str, team: Team = None) -> Player:
    """
    Generates a new player for the given rarity tier (fallback utility for academy / system tools).
    """
    if rarity == 'LEGENDARY':
        overall = random.randint(70, 75)
        potential_ovr = random.randint(90, 95)
        base_stamina = random.randint(85, 95)
        age = random.randint(18, 22)
    elif rarity == 'EPIC':
        overall = random.randint(68, 73)
        potential_ovr = random.randint(84, 89)
        base_stamina = random.randint(75, 88)
        age = random.randint(19, 24)
    else:  # RARE / REGULAR
        overall = random.randint(65, 70)
        potential_ovr = random.randint(78, 83)
        base_stamina = random.randint(65, 82)
        age = random.randint(20, 26)

    name = f"{random.choice(RANDOM_FIRST_NAMES)} {random.choice(RANDOM_LAST_NAMES)}"
    position = random.choice(POSITION_POOL)

    player = Player.objects.create(
        team=team,
        name=name,
        age=age,
        position=position,
        overall=overall,
        base_overall=overall,
        base_stamina=base_stamina,
        virtual_stamina=100.00,
        rarity=rarity,
        potential_ovr=potential_ovr
    )
    return player


def weighted_sample_pack_cards(pack: Pack, unclaimed_list: list) -> list:
    """
    Samples 3 unique cards using admin-configured weights and guaranteed OVR slot.
    - Slot 1: If pack.guarantee_min_ovr > 0 and cards with overall >= guarantee_min_ovr exist,
              sample 1 card from them weighted by their effective weights.
    - Slots 2 & 3: Sample without replacement from the remaining cards weighted by effective weights.
    - Shuffles the 3 selected cards so the guaranteed card isn't always in slot 1.
    """
    if len(unclaimed_list) <= 3:
        cards = list(unclaimed_list)
        random.shuffle(cards)
        return cards

    pool = list(unclaimed_list)
    selected = []

    # 1. Smart Guaranteed Slot (if configured and eligible cards exist)
    min_ovr = getattr(pack, 'guarantee_min_ovr', 90) or 0
    guaranteed_candidates = [p for p in pool if p.overall >= min_ovr] if min_ovr > 0 else []

    if guaranteed_candidates:
        # In the guaranteed slot, top-tier (94+) stars should have competitive drop odds
        # rather than being suppressed by mid-tier (90-93) cards!
        mid_w = getattr(pack, 'weight_mid_tier', 5) or 5
        g_weights = []
        for p in guaranteed_candidates:
            w = p.get_effective_weight()
            if p.overall >= 94:
                # Guarantee slot boosts 94+ to at least equal footing with mid-tier
                g_weights.append(max(w, mid_w))
            else:
                g_weights.append(w)

        chosen_g = random.choices(guaranteed_candidates, weights=g_weights, k=1)[0]
        selected.append(chosen_g)
        pool.remove(chosen_g)

    # 2. Pick remaining slots up to 3 cards using weighted sampling without replacement
    while len(selected) < 3 and pool:
        weights = [p.get_effective_weight() for p in pool]
        chosen = random.choices(pool, weights=weights, k=1)[0]
        selected.append(chosen)
        pool.remove(chosen)

    # 3. Shuffle so guaranteed card isn't always in the first position
    random.shuffle(selected)
    return selected


def open_pack(team_id: int, pack_id: int, payment_method: str = 'GEMS') -> dict:
    """
    Opens a pack for a team:
    - Verifies team squad capacity
    - Checks wallet balance and deducts cost atomically
    - Samples 3 weighted unique cards using smart guarantee and admin weights
    - Creates PackOpeningSession with 5-minute expiry
    - Emits real-time notification
    """
    if payment_method not in ['GEMS', 'DIRECT']:
        return {'success': False, 'error': 'روش پرداخت نامعتبر است.'}

    with transaction.atomic():
        try:
            team = Team.objects.select_for_update().get(id=team_id)
        except Team.DoesNotExist:
            return {'success': False, 'error': 'تیم یافت نشد.'}

        try:
            pack = Pack.objects.select_for_update().get(id=pack_id, is_active=True)
        except Pack.DoesNotExist:
            return {'success': False, 'error': 'پک انتخاب‌شده فعال یا موجود نیست.'}

        # Time window check
        if not pack.is_time_valid:
            return {'success': False, 'error': 'مهلت باز کردن این پک به پایان رسیده یا هنوز فعال نشده است.'}

        # Payment method validation
        if pack.purchase_method != 'BOTH' and pack.purchase_method != payment_method:
            return {'success': False, 'error': 'این پک با روش پرداخت انتخابی شما سازگار نیست.'}

        # Roster capacity check
        max_squad = team.max_squad_size
        if team.players.count() >= max_squad:
            return {
                'success': False,
                'error': f'تیم شما حداکثر ظرفیت مجاز ({max_squad} بازیکن) را دارد. برای جذب بازیکن جدید باید ظرفیت را ارتقا داده یا بازیکنی بفروشید.'
            }

        # Pool availability check (must have at least 3 unclaimed players)
        unclaimed_qs = pack.players.filter(is_claimed=False).select_for_update()
        unclaimed_list = list(unclaimed_qs)
        if len(unclaimed_list) < 3:
            return {
                'success': False,
                'error': 'موجودی بازیکنان این پک تمام شده است (کمتر از ۳ بازیکن موجود است).'
            }

        # Wallet deduction
        if payment_method == 'GEMS':
            cost = pack.cost_gems
            if cost > 0:
                wallet_res = process_atomic_wallet_update(
                    team_id=team.id,
                    amount=-cost,
                    currency='GEMS',
                    transaction_type='GACHA_OPEN',
                    description=f"باز کردن پک {pack.name} با جم"
                )
                if not wallet_res['success']:
                    return {'success': False, 'error': wallet_res.get('error', 'جم کافی نیست.')}
        else:
            cost = pack.cost_usd if pack.cost_usd > 0 else Decimal('0.00')
            if cost > 0:
                wallet_res = process_atomic_wallet_update(
                    team_id=team.id,
                    amount=-cost,
                    currency='BUDGET',
                    transaction_type='GACHA_OPEN',
                    description=f"باز کردن پک {pack.name} با دلار مجازی"
                )
                if not wallet_res['success']:
                    return {'success': False, 'error': wallet_res.get('error', 'موجودی دلار کافی نیست.')}

        # Sample 3 weighted cards using admin weights and smart guarantee slot
        selected_cards = weighted_sample_pack_cards(pack, unclaimed_list)

        # Create opening session (expires in 5 minutes)
        session = PackOpeningSession.objects.create(
            team=team,
            pack=pack,
            card_1=selected_cards[0],
            card_2=selected_cards[1],
            card_3=selected_cards[2],
            payment_method=payment_method,
            cost=cost,
            status='PENDING',
            expires_at=timezone.now() + timedelta(minutes=5)
        )

        def serialize_card(card: PackPlayer):
            return {
                'id': card.id,
                'name': card.name,
                'position': card.position,
                'compatible_positions': card.compatible_positions,
                'overall': card.overall,
                'potential_ovr': card.potential_ovr,
                'age': card.age,
                'base_stamina': card.base_stamina,
                'rarity': card.rarity,
                'nationality': card.nationality,
                'prime_club': card.prime_club,
                'club_logo': card.club_logo.url if card.club_logo else None,
                'wage': float(card.wage),
                'market_value': float(card.market_value),
                'card_image': card.card_image.url if card.card_image else None
            }

        return {
            'success': True,
            'session_id': session.id,
            'pack': {
                'id': pack.id,
                'name': pack.name,
                'tier': pack.tier,
                'cover_image': pack.cover_image.url if pack.cover_image else None,
                'ovr_range_text': pack.ovr_range_text,
            },
            'cards': [
                serialize_card(selected_cards[0]),
                serialize_card(selected_cards[1]),
                serialize_card(selected_cards[2]),
            ],
            'expires_at': session.expires_at.isoformat(),
            'remaining_balance': team.gems if payment_method == 'GEMS' else float(team.budget)
        }


def pick_card(session_id: int, pack_player_id: int, team_id: int) -> dict:
    """
    Phase 2: Pick 1 Card from the 3 Revealed in the Session
    1. Validates session status and expiry.
    2. Converts the picked PackPlayer into a real Player in the user's squad.
    3. Marks the picked PackPlayer as claimed; the other 2 return to the pack pool.
    4. Marks session COMPLETED and increments Season Pass progress.
    """
    with transaction.atomic():
        try:
            session = PackOpeningSession.objects.select_for_update().get(id=session_id)
        except PackOpeningSession.DoesNotExist:
            return {'success': False, 'error': 'سشن باز کردن پک یافت نشد.'}

        if session.team_id != team_id:
            return {'success': False, 'error': 'شما دسترسی به این سشن ندارید.'}

        if session.status == 'COMPLETED':
            return {'success': False, 'error': 'این سشن قبلاً تکمیل شده است.'}

        if session.status == 'EXPIRED' or session.is_expired:
            expire_session(session)
            return {'success': False, 'error': 'مهلت ۵ دقیقه‌ای انتخاب کارت منقضی شده و هزینه به حسابتان برگشت داده شد.'}

        valid_card_ids = [session.card_1_id, session.card_2_id, session.card_3_id]
        if pack_player_id not in valid_card_ids:
            return {'success': False, 'error': 'کارت انتخابی در میان کارت‌های این پک نیست.'}

        try:
            picked_card = PackPlayer.objects.select_for_update().get(id=pack_player_id)
        except PackPlayer.DoesNotExist:
            return {'success': False, 'error': 'کارت انتخابی یافت نشد.'}

        if picked_card.is_claimed:
            return {'success': False, 'error': 'این کارت قبلاً توسط کاربر دیگری دریافت شده است.'}

        team = session.team

        # Roster check
        if team.players.count() >= team.max_squad_size:
            return {
                'success': False,
                'error': f'تیم شما پر است ({team.max_squad_size} بازیکن). امکان افزودن بازیکن جدید نیست.'
            }

        # Find next available shirt number (1-99)
        existing_numbers = set(team.players.values_list('shirt_number', flat=True))
        next_number = 1
        while next_number in existing_numbers and next_number < 99:
            next_number += 1

        # Create concrete Player in the user's team
        player = Player.objects.create(
            team=team,
            name=picked_card.name,
            position=picked_card.position,
            compatible_positions=picked_card.compatible_positions or '',
            overall=picked_card.overall,
            base_overall=picked_card.overall,
            potential_ovr=picked_card.potential_ovr or 99,
            age=picked_card.age or 22,
            base_stamina=picked_card.base_stamina or 80,
            virtual_stamina=100.00,
            rarity=picked_card.rarity if picked_card.rarity else ('LEGENDARY' if session.pack.tier == 'LEGENDARY' else 'REGULAR'),
            wage=picked_card.wage or Decimal('100.00'),
            market_value=picked_card.market_value or Decimal('1000000.00'),
            shirt_number=next_number,
            is_starting=False,
            x_coord=0.0,
            y_coord=0.0,
            custom_photo=picked_card.card_image if picked_card.card_image else None
        )

        # Mark PackPlayer claimed
        picked_card.is_claimed = True
        picked_card.claimed_by_team = team
        picked_card.claimed_at = timezone.now()
        picked_card.save(update_fields=['is_claimed', 'claimed_by_team', 'claimed_at'])

        # Update Session
        session.picked_card = picked_card
        session.created_player = player
        session.status = 'COMPLETED'
        session.completed_at = timezone.now()
        session.save(update_fields=['picked_card', 'created_player', 'status', 'completed_at'])

        # Recalculate team star rating
        team.update_star_rating(save=True)

        # Season Pass progress increment
        try:
            from season_pass.services import increment_task_progress
            increment_task_progress(team, 'OPEN_PACKS', 1)
        except Exception:
            pass

        # Check if notify legendary pull is appropriate
        if picked_card.overall >= 87 or session.pack.tier == 'LEGENDARY' or picked_card.rarity == 'LEGENDARY':
            try:
                from notifications.services import send_telegram_message, create_notification
                title = "🌟 استخراج کارت اسطوره‌ای!"
                msg = f"مربی {team.name} موفق به دریافت کارت «{player.name}» ({player.position} - OVR {player.overall}) از پک {session.pack.name} شد!"
                send_telegram_message(f"{title}\n\n{msg}")
                create_notification(team=team, category='GACHA', title=title, message=msg)
            except Exception:
                pass

        return {
            'success': True,
            'message': f'بازیکن «{player.name}» با موفقیت به ترکیب تیم شما اضافه شد.',
            'player': {
                'id': player.id,
                'name': player.name,
                'position': player.position,
                'overall': player.overall,
                'potential_ovr': player.potential_ovr,
                'age': player.age,
                'base_stamina': player.base_stamina,
                'wage': float(player.wage),
                'market_value': float(player.market_value),
                'rarity': player.rarity,
                'card_image': picked_card.card_image.url if picked_card.card_image else None
            },
            'session_id': session.id,
            'pack_name': session.pack.name,
            'pack_tier': session.pack.tier
        }


def expire_session(session) -> bool:
    """
    Refunds payment and marks session EXPIRED. Accepts PackOpeningSession instance or integer session_id.
    """
    if isinstance(session, int):
        try:
            session = PackOpeningSession.objects.get(id=session)
        except PackOpeningSession.DoesNotExist:
            return False

    if session.status != 'PENDING':
        return False

    with transaction.atomic():
        session = PackOpeningSession.objects.select_for_update().get(id=session.id)
        if session.status != 'PENDING':
            return False

        # Refund
        if session.cost > 0:
            currency = 'GEMS' if session.payment_method == 'GEMS' else 'BUDGET'
            process_atomic_wallet_update(
                team_id=session.team_id,
                amount=session.cost,
                currency=currency,
                transaction_type='ADMIN_ADJUST',
                description=f"برگشت وجه به علت عدم انتخاب کارت در سشن پک #{session.id}"
            )

        session.status = 'EXPIRED'
        session.save(update_fields=['status'])
        return True


def expire_all_stale_sessions() -> int:
    """
    Finds and auto-refunds all expired pending sessions.
    """
    stale_sessions = PackOpeningSession.objects.filter(
        status='PENDING',
        expires_at__lt=timezone.now()
    )
    count = 0
    for s in stale_sessions:
        if expire_session(s):
            count += 1
    return count
