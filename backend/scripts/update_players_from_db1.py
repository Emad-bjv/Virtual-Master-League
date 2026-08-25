import os
import sys
import re
import json
import django
from decimal import Decimal

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player, ClubFacilities, TeamGamePlan
from teams.lineup_services import auto_assign_team_starting_lineup

def parse_currency(val_str):
    val_str = val_str.replace('€', '').replace('$', '').strip()
    if 'M' in val_str:
        num = float(val_str.replace('M', '').strip())
        return Decimal(str(int(num * 1000000)))
    elif 'K' in val_str:
        num = float(val_str.replace('K', '').strip())
        return Decimal(str(int(num * 1000)))
    else:
        try:
            return Decimal(str(float(val_str)))
        except ValueError:
            return Decimal('1000000.00')

def map_primary_position(pos_str):
    # Take the first position in the space-separated list
    first_pos = pos_str.split()[0].upper() if pos_str else 'CMF'
    MAPPING = {
        'ST': 'CF',
        'LW': 'LWF',
        'RW': 'RWF',
        'CAM': 'AMF',
        'CM': 'CMF',
        'CDM': 'DMF',
        'LM': 'LMF',
        'RM': 'RMF',
        'LB': 'LB',
        'RB': 'RB',
        'CB': 'CB',
        'GK': 'GK',
        'SS': 'SS',
        'CF': 'CF',
        'LWF': 'LWF',
        'RWF': 'RWF',
        'AMF': 'AMF',
        'CMF': 'CMF',
        'DMF': 'DMF',
        'LMF': 'LMF',
        'RMF': 'RMF',
    }
    return MAPPING.get(first_pos, 'CMF')

def get_rarity(ovr):
    if ovr >= 88:
        return 'LEGENDARY'
    elif ovr >= 83:
        return 'EPIC'
    elif ovr >= 78:
        return 'RARE'
    return 'REGULAR'

def get_base_stamina(ovr, pos):
    if pos == 'GK':
        return 75
    if pos in ['LB', 'RB', 'CMF', 'DMF', 'LMF', 'RMF']:
        return max(78, min(95, ovr + 5))
    return max(75, min(92, ovr + 3))

def update_from_players_db1():
    md_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'players_database1.md')
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_team = None
    players_by_team = {}

    for line in lines:
        line = line.strip()
        if 'ناپولی' in line or 'SSC Napoli' in line and line.startswith('##'):
            current_team = 'SSC Napoli'
            players_by_team[current_team] = []
        elif 'آ اس رم' in line or 'AS Roma' in line and line.startswith('##'):
            current_team = 'AS Roma'
            players_by_team[current_team] = []
        elif line.startswith('|') and current_team:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            # Table format: | Row | Name | Positions | Age | OVR | POT | Contract | Value | Wage | Total Stats |
            if len(parts) >= 9 and parts[0].isdigit():
                name = parts[1]
                positions = parts[2]
                age = int(parts[3])
                ovr = int(parts[4])
                pot = int(parts[5])
                mv = parse_currency(parts[7])
                wage = parse_currency(parts[8])
                players_by_team[current_team].append({
                    'name': name,
                    'position': map_primary_position(positions),
                    'raw_positions': positions,
                    'age': age,
                    'overall': ovr,
                    'potential_ovr': pot,
                    'market_value': mv,
                    'wage': wage,
                })

    print(f"Parsed {len(players_by_team.get('SSC Napoli', []))} players for SSC Napoli from players_database1.md")
    print(f"Parsed {len(players_by_team.get('AS Roma', []))} players for AS Roma from players_database1.md")

    team_configs = {
        'AS Roma': {
            'logo': '/logos/as-roma.webp',
            'formation': '4-5-1 (4-2-3-1)',
            'budget': Decimal('100000000.00'),
            'wage_cap': Decimal('5000000.00'),
        },
        'SSC Napoli': {
            'logo': '/logos/napoli.webp',
            'formation': '4-3-3 (4-3-3)',
            'budget': Decimal('100000000.00'),
            'wage_cap': Decimal('5000000.00'),
        }
    }

    # Load fixture to sync
    fixture_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'teams', 'fixtures', 'fc26_players.json')
    with open(fixture_path, 'r', encoding='utf-8') as f:
        fixture_data = json.load(f)

    for t_name, t_conf in team_configs.items():
        team_obj, _ = Team.objects.update_or_create(
            name=t_name,
            defaults={
                'logo': t_conf['logo'],
                'budget': t_conf['budget'],
                'gems': 500,
                'wage_cap': t_conf['wage_cap'],
                'default_formation': t_conf['formation'],
                'is_active': True,
            }
        )
        ClubFacilities.objects.get_or_create(team=team_obj)
        TeamGamePlan.objects.get_or_create(team=team_obj, defaults={'formation': t_conf['formation']})

        # Remove old players not in the new db1 list
        new_player_names = [p['name'] for p in players_by_team.get(t_name, [])]
        Player.objects.filter(team=team_obj).exclude(name__in=new_player_names).delete()

        # Update or create each player
        for p in players_by_team.get(t_name, []):
            rarity = get_rarity(p['overall'])
            stamina = get_base_stamina(p['overall'], p['position'])

            Player.objects.update_or_create(
                team=team_obj,
                name=p['name'],
                defaults={
                    'age': p['age'],
                    'position': p['position'],
                    'overall': p['overall'],
                    'potential_ovr': p['potential_ovr'],
                    'base_stamina': stamina,
                    'virtual_stamina': Decimal('100.00'),
                    'wage': p['wage'],
                    'market_value': p['market_value'],
                    'rarity': rarity,
                    'is_injured': False,
                    'suspension_matches': 0,
                }
            )

        auto_assign_team_starting_lineup(team_obj)
        team_obj.update_star_rating(save=True)
        print(f"✓ {team_obj.name}: {team_obj.players.count()} players updated. Star rating: {team_obj.star_rating}⭐")

    # Update fixture JSON
    # Remove existing entries for AS Roma & SSC Napoli in fixture, then re-append cleanly
    team_pk_map = {}
    cleaned_fixture = []
    for item in fixture_data:
        if item['model'] == 'teams.team':
            team_pk_map[item['fields']['name']] = item['pk']
            if item['fields']['name'] not in ['AS Roma', 'SSC Napoli']:
                cleaned_fixture.append(item)
        elif item['model'] == 'teams.player':
            # keep if not belonging to AS Roma / Napoli
            t_pk = item['fields']['team']
            t_name = next((k for k, v in team_pk_map.items() if v == t_pk), None)
            if t_name not in ['AS Roma', 'SSC Napoli']:
                cleaned_fixture.append(item)

    max_team_pk = max([item['pk'] for item in cleaned_fixture if item['model'] == 'teams.team'] + [270])
    max_player_pk = max([item['pk'] for item in cleaned_fixture if item['model'] == 'teams.player'] + [700])

    for t_name, t_conf in team_configs.items():
        max_team_pk += 1
        t_pk = max_team_pk
        cleaned_fixture.append({
            "model": "teams.team",
            "pk": t_pk,
            "fields": {
                "name": t_name,
                "logo": t_conf['logo'],
                "budget": str(t_conf['budget']),
                "wage_cap": str(t_conf['wage_cap']),
                "star_rating": str(Team.objects.get(name=t_name).star_rating)
            }
        })

        for p in players_by_team.get(t_name, []):
            max_player_pk += 1
            rarity = get_rarity(p['overall'])
            stamina = get_base_stamina(p['overall'], p['position'])
            cleaned_fixture.append({
                "model": "teams.player",
                "pk": max_player_pk,
                "fields": {
                    "team": t_pk,
                    "name": p['name'],
                    "age": p['age'],
                    "position": p['position'],
                    "overall": p['overall'],
                    "potential_ovr": p['potential_ovr'],
                    "base_stamina": stamina,
                    "virtual_stamina": "100.00",
                    "wage": str(p['wage']),
                    "rarity": rarity,
                    "market_value": str(p['market_value'])
                }
            })

    with open(fixture_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_fixture, f, indent=2, ensure_ascii=False)

    print("✓ Successfully synchronized database and fc26_players.json with players_database1.md!")

if __name__ == '__main__':
    update_from_players_db1()
