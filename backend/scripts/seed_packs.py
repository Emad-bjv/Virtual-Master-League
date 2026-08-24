import os
import sys
import django
from decimal import Decimal

# Setup django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from gacha.models import Pack, PackPlayer

def seed_packs():
    print("--- Seeding Initial Packs & Player Pools ---")

    # 1. Bronze Pack
    bronze_pack, created = Pack.objects.get_or_create(
        name="پک شانس برنز",
        defaults={
            'tier': 'BRONZE',
            'description': 'پک اقتصادی برنز شامل بازیکنان بااستعداد و آینده‌دار لیگ با اورال ۷۲ تا ۷۹.',
            'ovr_range_text': 'OVR 72-79',
            'cost_gems': 30,
            'cost_usd': Decimal('15.00'),
            'cost_irr': 25000,
            'purchase_method': 'BOTH',
            'is_active': True,
            'sort_order': 1
        }
    )

    bronze_players = [
        {"name": "Julian Alvarez", "position": "CF", "overall": 79, "age": 22, "base_stamina": 82},
        {"name": "Gavi", "position": "CMF", "overall": 78, "age": 19, "base_stamina": 85},
        {"name": "Alejandro Garnacho", "position": "LWF", "overall": 77, "age": 20, "base_stamina": 80},
        {"name": "Warren Zaire-Emery", "position": "CMF", "overall": 76, "age": 18, "base_stamina": 84},
        {"name": "Arda Guler", "position": "AMF", "overall": 77, "age": 19, "base_stamina": 78},
        {"name": "Malo Gusto", "position": "RB", "overall": 76, "age": 21, "base_stamina": 83},
        {"name": "Destiny Udogie", "position": "LB", "overall": 78, "age": 21, "base_stamina": 86},
        {"name": "Giorgi Mamardashvili", "position": "GK", "overall": 79, "age": 23, "base_stamina": 75},
    ]

    for p in bronze_players:
        PackPlayer.objects.get_or_create(
            pack=bronze_pack,
            name=p['name'],
            defaults={
                'position': p['position'],
                'overall': p['overall'],
                'age': p['age'],
                'base_stamina': p['base_stamina'],
                'rarity': 'RARE',
                'wage': Decimal('150.00'),
                'market_value': Decimal('15000000.00')
            }
        )
    print(f"Bronze Pack ready with {bronze_pack.players.count()} players.")

    # 2. Silver Pack
    silver_pack, created = Pack.objects.get_or_create(
        name="پک ستاره‌های نقره‌ای",
        defaults={
            'tier': 'SILVER',
            'description': 'شامل ستاره‌های برتر و تاثیرگذار فوتبال دنیا با اورال ۸۰ تا ۸۵.',
            'ovr_range_text': 'OVR 80-85',
            'cost_gems': 75,
            'cost_usd': Decimal('35.00'),
            'cost_irr': 65000,
            'purchase_method': 'BOTH',
            'is_active': True,
            'sort_order': 2
        }
    )

    silver_players = [
        {"name": "Federico Valverde", "position": "CMF", "overall": 85, "age": 25, "base_stamina": 92},
        {"name": "Bukayo Saka", "position": "RWF", "overall": 84, "age": 22, "base_stamina": 88},
        {"name": "Rafael Leao", "position": "LWF", "overall": 84, "age": 24, "base_stamina": 87},
        {"name": "William Saliba", "position": "CB", "overall": 83, "age": 23, "base_stamina": 85},
        {"name": "Theo Hernandez", "position": "LB", "overall": 85, "age": 26, "base_stamina": 90},
        {"name": "Aurelien Tchouameni", "position": "DMF", "overall": 83, "age": 24, "base_stamina": 88},
        {"name": "Alphonso Davies", "position": "LB", "overall": 84, "age": 23, "base_stamina": 91},
        {"name": "Mike Maignan", "position": "GK", "overall": 85, "age": 28, "base_stamina": 80},
    ]

    for p in silver_players:
        PackPlayer.objects.get_or_create(
            pack=silver_pack,
            name=p['name'],
            defaults={
                'position': p['position'],
                'overall': p['overall'],
                'age': p['age'],
                'base_stamina': p['base_stamina'],
                'rarity': 'EPIC',
                'wage': Decimal('350.00'),
                'market_value': Decimal('35000000.00')
            }
        )
    print(f"Silver Pack ready with {silver_pack.players.count()} players.")

    # 3. Milan Legends Pack
    legend_pack, created = Pack.objects.get_or_create(
        name="پک اساطیر روسونری (Milan Legends)",
        defaults={
            'tier': 'LEGENDARY',
            'description': 'پک ویژه و اختصاصی اسطوره‌های میلان بزرگ با اورال ۸۸ تا ۹۵. انتخاب سرنوشت‌ساز ۱ از ۳ اسطوره.',
            'ovr_range_text': 'OVR 88-95',
            'cost_gems': 200,
            'cost_usd': Decimal('80.00'),
            'cost_irr': 180000,
            'purchase_method': 'BOTH',
            'featured_team': 'AC Milan',
            'is_active': True,
            'sort_order': 3
        }
    )

    milan_legends = [
        {"name": "Paolo Maldini", "position": "CB", "overall": 95, "age": 26, "base_stamina": 95},
        {"name": "Kaka", "position": "AMF", "overall": 93, "age": 25, "base_stamina": 90},
        {"name": "Andriy Shevchenko", "position": "CF", "overall": 92, "age": 27, "base_stamina": 92},
        {"name": "Alessandro Nesta", "position": "CB", "overall": 93, "age": 28, "base_stamina": 91},
        {"name": "Andrea Pirlo", "position": "DMF", "overall": 91, "age": 27, "base_stamina": 86},
        {"name": "Clarence Seedorf", "position": "CMF", "overall": 90, "age": 28, "base_stamina": 93},
        {"name": "Filippo Inzaghi", "position": "CF", "overall": 89, "age": 29, "base_stamina": 88},
        {"name": "Dida", "position": "GK", "overall": 88, "age": 30, "base_stamina": 82},
    ]

    for p in milan_legends:
        PackPlayer.objects.get_or_create(
            pack=legend_pack,
            name=p['name'],
            defaults={
                'position': p['position'],
                'overall': p['overall'],
                'age': p['age'],
                'base_stamina': p['base_stamina'],
                'rarity': 'LEGENDARY',
                'wage': Decimal('750.00'),
                'market_value': Decimal('80000000.00')
            }
        )
    print(f"Milan Legends Pack ready with {legend_pack.players.count()} players.")
    print("--- Done Seeding Packs ---")

if __name__ == '__main__':
    seed_packs()
