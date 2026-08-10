from decimal import Decimal

PACK_TIER_PRICING = {
    'BRONZE':    {'cost_gems': 25,  'cost_irr': 19000},
    'SILVER':    {'cost_gems': 60,  'cost_irr': 49000},
    'GOLD':      {'cost_gems': 120, 'cost_irr': 99000},
    'LEGENDARY': {'cost_gems': 250, 'cost_irr': 199000},
}

SAME_DAY_PACK_INFLATION = Decimal('1.15')  # 15% inflation for each subsequent pack on same day

def get_effective_gem_cost(team, pack) -> int:
    from django.utils import timezone
    from gacha.models import PackOpeningLog
    today_pulls = PackOpeningLog.objects.filter(
        team=team, opened_at__date=timezone.now().date(), payment_method='GEMS'
    ).count()
    inflation = SAME_DAY_PACK_INFLATION ** today_pulls
    return int(pack.cost_gems * inflation)
