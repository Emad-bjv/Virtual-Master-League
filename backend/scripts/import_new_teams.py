import os
import sys
import json
import django
from decimal import Decimal

# Setup django
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player, ClubFacilities, TeamGamePlan
from teams.lineup_services import auto_assign_team_starting_lineup

def compute_player_attributes(ovr, pos):
    if ovr >= 88:
        rarity = 'LEGENDARY'
    elif ovr >= 83:
        rarity = 'EPIC'
    elif ovr >= 78:
        rarity = 'RARE'
    else:
        rarity = 'REGULAR'
    
    # Potential OVR
    potential_ovr = min(99, ovr + 2)
    
    # Base Stamina
    if pos == 'GK':
        base_stamina = 75
    elif pos in ['LB', 'RB', 'LWB', 'RWB', 'CMF', 'DMF']:
        base_stamina = max(78, min(95, ovr + 5))
    else:
        base_stamina = max(75, min(92, ovr + 3))
    
    # Wage (USD / week)
    if ovr >= 86:
        wage = Decimal(str((ovr - 60) * 4000))
    elif ovr >= 82:
        wage = Decimal(str((ovr - 60) * 2800))
    elif ovr >= 78:
        wage = Decimal(str((ovr - 60) * 2000))
    else:
        wage = Decimal(str((ovr - 60) * 1200))
        
    # Market value
    if ovr >= 86:
        mv = Decimal(str((ovr - 70) * 5000000))
    elif ovr >= 82:
        mv = Decimal(str((ovr - 70) * 2500000))
    elif ovr >= 78:
        mv = Decimal(str((ovr - 70) * 1200000))
    else:
        mv = Decimal(str(max(1000000, (ovr - 65) * 500000)))
        
    return rarity, potential_ovr, base_stamina, wage, mv

def import_teams_and_players():
    md_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'players_database.md')
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_team = None
    players_by_team = {}

    for line in lines:
        line = line.strip()
        if 'AS Roma' in line and line.startswith('##'):
            current_team = 'AS Roma'
            players_by_team[current_team] = []
        elif 'SSC Napoli' in line and line.startswith('##'):
            current_team = 'SSC Napoli'
            players_by_team[current_team] = []
        elif line.startswith('|') and current_team:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 4 and parts[0].isdigit():
                p_name = parts[1]
                p_pos = parts[2]
                p_ovr = int(parts[3])
                players_by_team[current_team].append({
                    'name': p_name,
                    'position': p_pos,
                    'overall': p_ovr,
                })

    print(f"Parsed AS Roma: {len(players_by_team.get('AS Roma', []))} players")
    print(f"Parsed SSC Napoli: {len(players_by_team.get('SSC Napoli', []))} players")

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

    # Load existing fixture to preserve PK IDs
    fixture_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'teams', 'fixtures', 'fc26_players.json')
    with open(fixture_path, 'r', encoding='utf-8') as f:
        fixture_data = json.load(f)

    max_team_pk = max([item['pk'] for item in fixture_data if item['model'] == 'teams.team'] + [270])
    max_player_pk = max([item['pk'] for item in fixture_data if item['model'] == 'teams.player'] + [700])

    for t_name, t_conf in team_configs.items():
        team_obj, created = Team.objects.update_or_create(
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
        
        # Check if team already exists in fixture
        team_fixture_entry = next((item for item in fixture_data if item['model'] == 'teams.team' and item['fields']['name'] == t_name), None)
        if not team_fixture_entry:
            max_team_pk += 1
            t_pk = max_team_pk
            fixture_data.append({
                "model": "teams.team",
                "pk": t_pk,
                "fields": {
                    "name": t_name,
                    "logo": t_conf['logo'],
                    "budget": str(t_conf['budget']),
                    "wage_cap": str(t_conf['wage_cap']),
                    "star_rating": "4.0"
                }
            })
        else:
            t_pk = team_fixture_entry['pk']

        # Import players
        for p_data in players_by_team.get(t_name, []):
            rarity, pot_ovr, stamina, wage, mv = compute_player_attributes(p_data['overall'], p_data['position'])
            
            p_obj, p_created = Player.objects.update_or_create(
                name=p_data['name'],
                team=team_obj,
                defaults={
                    'age': 25,
                    'position': p_data['position'],
                    'overall': p_data['overall'],
                    'potential_ovr': pot_ovr,
                    'base_stamina': stamina,
                    'virtual_stamina': Decimal('100.00'),
                    'wage': wage,
                    'market_value': mv,
                    'rarity': rarity,
                    'is_injured': False,
                    'suspension_matches': 0,
                }
            )

            # Check if player in fixture
            player_fixture_entry = next((item for item in fixture_data if item['model'] == 'teams.player' and item['fields']['name'] == p_data['name'] and item['fields']['team'] == t_pk), None)
            if not player_fixture_entry:
                max_player_pk += 1
                fixture_data.append({
                    "model": "teams.player",
                    "pk": max_player_pk,
                    "fields": {
                        "team": t_pk,
                        "name": p_data['name'],
                        "age": 25,
                        "position": p_data['position'],
                        "overall": p_data['overall'],
                        "potential_ovr": pot_ovr,
                        "base_stamina": stamina,
                        "virtual_stamina": "100.00",
                        "wage": str(wage),
                        "rarity": rarity,
                        "market_value": str(mv)
                    }
                })

        # Auto assign lineup
        auto_assign_team_starting_lineup(team_obj)
        team_obj.update_star_rating(save=True)
        print(f"✓ Team {team_obj.name} imported with {team_obj.players.count()} players (Star Rating: {team_obj.star_rating}⭐)")

    # Save updated fixture
    with open(fixture_path, 'w', encoding='utf-8') as f:
        json.dump(fixture_data, f, indent=2, ensure_ascii=False)
    print("✓ Successfully updated fc26_players.json fixture!")

if __name__ == '__main__':
    import_teams_and_players()
