import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Player

valid_positions = {
    'GK', 'CB', 'LB', 'RB', 'DMF', 'CMF', 'AMF', 'LMF', 'RMF', 'LWF', 'RWF', 'SS', 'CF'
}

position_map = {
    'RM': 'RMF',
    'LM': 'LMF',
    'CM': 'CMF',
    'CDM': 'DMF',
    'CAM': 'AMF',
    'RW': 'RWF',
    'LW': 'LWF',
    'ST': 'CF',
    'LWB': 'LB',
    'RWB': 'RB',
}

players = Player.objects.all()
fixed = 0
for p in players:
    if p.position not in valid_positions:
        old_pos = p.position
        if old_pos in position_map:
            p.position = position_map[old_pos]
            p.save(update_fields=['position'])
            fixed += 1
            print(f"Fixed {p.name}: {old_pos} -> {p.position}")
        else:
            print(f"UNKNOWN POS: {p.name} has {old_pos}")

print(f"Fixed {fixed} players.")
