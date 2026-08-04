import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player, ClubFacilities
from economy.models import StorePackage
from gacha.models import GachaPack
from transfers.models import TransferListing
from decimal import Decimal

def seed():
    print("Seeding database...")
    
    # 1. Teams
    alborz, _ = Team.objects.get_or_create(
        id=1,
        defaults={'name': 'باشگاه البرز', 'budget': Decimal('850000000.00')}
    )
    tractors, _ = Team.objects.get_or_create(
        id=2,
        defaults={'name': 'تراکتور', 'budget': Decimal('900000000.00')}
    )
    esteghlal, _ = Team.objects.get_or_create(
        id=3,
        defaults={'name': 'استقلال', 'budget': Decimal('750000000.00')}
    )
    
    # Club Facilities for Alborz
    ClubFacilities.objects.get_or_create(
        team=alborz,
        defaults={
            'stadium_level': 4,
            'academy_level': 3,
            'medical_level': 2,
            'gym_level': 3,
            'scouting_level': 2,
            'training_camp_level': 3
        }
    )

    # 2. Players for Alborz
    players_data = [
        {'name': 'سید حسین حسینی', 'age': 31, 'position': 'GK', 'overall': 78, 'base_stamina': 80, 'virtual_stamina': 100.0, 'x_coord': 5, 'y_coord': 50, 'is_starting': True},
        {'name': 'روزبه چشمی', 'age': 30, 'position': 'CB', 'overall': 76, 'base_stamina': 78, 'virtual_stamina': 95.0, 'x_coord': 20, 'y_coord': 50, 'is_starting': True},
        {'name': 'ابوالفضل جلالی', 'age': 26, 'position': 'LB', 'overall': 75, 'base_stamina': 76, 'virtual_stamina': 70.0, 'x_coord': 28, 'y_coord': 20, 'is_starting': True},
        {'name': 'صالح حردانی', 'age': 25, 'position': 'RB', 'overall': 74, 'base_stamina': 75, 'virtual_stamina': 90.0, 'x_coord': 28, 'y_coord': 80, 'is_starting': True},
        {'name': 'علی کریمی', 'age': 30, 'position': 'CMF', 'overall': 79, 'base_stamina': 82, 'virtual_stamina': 40.0, 'is_injured': True, 'x_coord': 50, 'y_coord': 50, 'is_starting': True},
        {'name': 'جلال‌الدین ماشاریپوف', 'age': 30, 'position': 'AMF', 'overall': 80, 'base_stamina': 85, 'virtual_stamina': 98.0, 'x_coord': 72, 'y_coord': 35, 'is_starting': True},
        {'name': 'گوستاوو بلانکو', 'age': 32, 'position': 'CF', 'overall': 81, 'base_stamina': 78, 'virtual_stamina': 92.0, 'x_coord': 85, 'y_coord': 50, 'is_starting': True},
        {'name': 'سجاد حسینی', 'age': 22, 'position': 'CF', 'overall': 72, 'base_stamina': 70, 'virtual_stamina': 85.0, 'x_coord': 0, 'y_coord': 0, 'is_starting': False},
        {'name': 'رضا کریمی', 'age': 24, 'position': 'CMF', 'overall': 75, 'base_stamina': 74, 'virtual_stamina': 80.0, 'x_coord': 0, 'y_coord': 0, 'is_starting': False},
    ]

    for pdata in players_data:
        Player.objects.get_or_create(
            name=pdata['name'],
            team=alborz,
            defaults=pdata
        )

    # 3. Store Packages
    StorePackage.objects.get_or_create(
        name='پک برنزی',
        defaults={'usd_amount': Decimal('100.00'), 'price_irr': 19000, 'is_active': True}
    )
    StorePackage.objects.get_or_create(
        name='پک طلایی ویژه',
        defaults={'usd_amount': Decimal('500.00'), 'price_irr': 99000, 'is_active': True}
    )

    # 4. Gacha Packs
    GachaPack.objects.get_or_create(
        name='پک ستاره‌های لیگ',
        defaults={'cost_usd': Decimal('50.00'), 'rate_rare': Decimal('70.00'), 'rate_epic': Decimal('25.00'), 'rate_legendary': Decimal('5.00'), 'is_active': True}
    )

    # 5. Transfer Listings
    seller_player = Player.objects.filter(team=alborz, name='سجاد حسینی').first()
    if seller_player:
        TransferListing.objects.get_or_create(
            player=seller_player,
            seller_team=alborz,
            defaults={'price_usd': Decimal('200000.00'), 'listing_type': 'FIXED_PRICE', 'status': 'ACTIVE'}
        )

    print("Seeding completed successfully!")

if __name__ == '__main__':
    seed()
