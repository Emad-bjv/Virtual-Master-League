from decimal import Decimal

# Default tier presets (used as admin suggestions)
PACK_TIER_PRESETS = {
    'BRONZE': {
        'name': 'پک برنز',
        'tier': 'BRONZE',
        'cost_gems': 25,
        'cost_irr': 19000,
        'ovr_range_text': 'OVR 70-79'
    },
    'SILVER': {
        'name': 'پک نقره',
        'tier': 'SILVER',
        'cost_gems': 60,
        'cost_irr': 49000,
        'ovr_range_text': 'OVR 80-84'
    },
    'LEGENDARY': {
        'name': 'پک اسطوره‌ها',
        'tier': 'LEGENDARY',
        'cost_gems': 250,
        'cost_irr': 199000,
        'ovr_range_text': 'OVR 85-94'
    },
}
