import random
from decimal import Decimal
from django.db import transaction
from teams.models import Team, Player
from economy.services import process_atomic_wallet_update
from .models import GachaPack, GachaPity, PackOpeningLog


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


def generate_random_player(rarity: str, team: Team) -> Player:
    """
    Generates a new player for the given rarity tier if no unassigned player exists.
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
    else: # RARE
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
        base_stamina=base_stamina,
        virtual_stamina=100.00,
        rarity=rarity,
        potential_ovr=potential_ovr
    )
    from teams.models import PlayerAbilities
    PlayerAbilities.objects.create(player=player)
    return player


def open_gacha_pack(team_id: int, pack_id: int) -> dict:
    """
    Executes the opening of a Gacha pack.
    Includes drop rates, Pity counter, wallet deduction, and roster cap check.
    """
    with transaction.atomic():
        try:
            team = Team.objects.select_for_update().get(id=team_id)
            pack = GachaPack.objects.get(id=pack_id, is_active=True)
        except Team.DoesNotExist:
            return {'success': False, 'error': 'تیم یافت نشد.'}
        except GachaPack.DoesNotExist:
            return {'success': False, 'error': 'پک انتخاب‌شده فعال یا موجود نیست.'}

        # 1. Roster cap check (max 25 players)
        if team.players.count() >= 25:
            return {
                'success': False,
                'error': 'تیم شما حداکثر ظرفیت مجاز (۲۵ بازیکن) را دارد. ابتدا بازیکن مازاد بفروشید یا آزاد کنید.'
            }

        # 2. Wallet deduction
        wallet_res = process_atomic_wallet_update(
            team_id=team.id,
            amount_usd=-pack.cost_usd,
            transaction_type='WITHDRAW',
            description=f"خرید پک {pack.name}"
        )
        if not wallet_res['success']:
            return {'success': False, 'error': wallet_res.get('error', 'موجودی کافی نیست.')}

        # 3. Get or Create Pity Counter
        pity, _ = GachaPity.objects.get_or_create(team=team)

        # 4. Determine Rarity (Pity vs Roll)
        pity_applied = False
        
        # Check global max legendary (30)
        active_legendaries = Player.objects.filter(rarity='LEGENDARY').exclude(team=None).count()
        can_pull_legendary = active_legendaries < 30
        
        if pity.counter >= GachaPity.PITY_THRESHOLD and can_pull_legendary:
            rarity = 'LEGENDARY'
            pity_applied = True
            pity.counter = 0
        else:
            roll = random.uniform(0, 100)
            rate_leg = float(pack.rate_legendary)
            rate_epic = float(pack.rate_epic)

            if roll <= rate_leg and can_pull_legendary:
                rarity = 'LEGENDARY'
                pity.counter = 0
            elif roll <= (rate_leg + rate_epic):
                rarity = 'EPIC'
                pity.counter += 1
            else:
                rarity = 'RARE'
                pity.counter += 1

        pity.total_pulls += 1
        pity.save()

        # 5. Fetch or Generate Player (Gacha only gives random unassigned now, no license players according to user)
        # Note: 'unassigned' logic here should be updated to only pick players matching rarity
        unassigned = Player.objects.filter(team=None, rarity=rarity).first()

        if unassigned:
            unassigned.team = team
            unassigned.save(update_fields=['team'])
            player = unassigned
        else:
            player = generate_random_player(rarity, team)

        # 6. Log Pack Opening
        log = PackOpeningLog.objects.create(
            team=team,
            pack=pack,
            player_obtained=player,
            rarity_drawn=rarity,
            pity_applied=pity_applied,
            cost_usd=pack.cost_usd
        )

        return {
            'success': True,
            'player': {
                'id': player.id,
                'name': player.name,
                'position': player.position,
                'overall': player.overall,
                'age': player.age,
                'base_stamina': player.base_stamina
            },
            'rarity': rarity,
            'pity_applied': pity_applied,
            'pity_counter': pity.counter,
            'remaining_budget': team.budget,
            'log_id': log.id
        }
