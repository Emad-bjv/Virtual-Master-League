from decimal import Decimal
from .models import Team, Player, TeamGamePlan

FORMATION_PRESETS = {
    '4-5-1 (4-2-3-1)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'DMF', 'x': 35.0, 'y': 56.0},
        {'pos': 'DMF', 'x': 65.0, 'y': 56.0},
        {'pos': 'LWF', 'x': 20.0, 'y': 36.0},
        {'pos': 'AMF', 'x': 50.0, 'y': 36.0},
        {'pos': 'RWF', 'x': 80.0, 'y': 36.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '4-3-3 (4-2-1-3)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'DMF', 'x': 35.0, 'y': 56.0},
        {'pos': 'CMF', 'x': 65.0, 'y': 56.0},
        {'pos': 'AMF', 'x': 50.0, 'y': 38.0},
        {'pos': 'LWF', 'x': 18.0, 'y': 20.0},
        {'pos': 'RWF', 'x': 82.0, 'y': 20.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '4-3-3 (4-1-2-3)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 60.0},
        {'pos': 'AMF', 'x': 35.0, 'y': 42.0},
        {'pos': 'AMF', 'x': 65.0, 'y': 42.0},
        {'pos': 'LWF', 'x': 18.0, 'y': 20.0},
        {'pos': 'RWF', 'x': 82.0, 'y': 20.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '4-4-2 (4-3-1-2)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 15.0, 'y': 72.0},
        {'pos': 'CB', 'x': 35.0, 'y': 75.0},
        {'pos': 'CB', 'x': 65.0, 'y': 75.0},
        {'pos': 'RB', 'x': 85.0, 'y': 72.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 62.0},
        {'pos': 'CMF', 'x': 30.0, 'y': 48.0},
        {'pos': 'CMF', 'x': 70.0, 'y': 48.0},
        {'pos': 'AMF', 'x': 50.0, 'y': 34.0},
        {'pos': 'CF', 'x': 38.0, 'y': 18.0},
        {'pos': 'CF', 'x': 62.0, 'y': 18.0},
    ],
    '3-6-1 (3-2-4-1)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'CB', 'x': 25.0, 'y': 75.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 75.0, 'y': 75.0},
        {'pos': 'DMF', 'x': 38.0, 'y': 58.0},
        {'pos': 'DMF', 'x': 62.0, 'y': 58.0},
        {'pos': 'LMF', 'x': 15.0, 'y': 38.0},
        {'pos': 'AMF', 'x': 38.0, 'y': 35.0},
        {'pos': 'AMF', 'x': 62.0, 'y': 35.0},
        {'pos': 'RMF', 'x': 85.0, 'y': 38.0},
        {'pos': 'CF', 'x': 50.0, 'y': 15.0},
    ],
    '3-5-2 (3-2-3-2)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'CB', 'x': 25.0, 'y': 75.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 75.0, 'y': 75.0},
        {'pos': 'DMF', 'x': 38.0, 'y': 58.0},
        {'pos': 'DMF', 'x': 62.0, 'y': 58.0},
        {'pos': 'LMF', 'x': 15.0, 'y': 40.0},
        {'pos': 'AMF', 'x': 50.0, 'y': 36.0},
        {'pos': 'RMF', 'x': 85.0, 'y': 40.0},
        {'pos': 'CF', 'x': 38.0, 'y': 18.0},
        {'pos': 'CF', 'x': 62.0, 'y': 18.0},
    ],
    '5-3-2 (5-3-2)': [
        {'pos': 'GK', 'x': 50.0, 'y': 90.0},
        {'pos': 'LB', 'x': 12.0, 'y': 68.0},
        {'pos': 'CB', 'x': 30.0, 'y': 76.0},
        {'pos': 'CB', 'x': 50.0, 'y': 78.0},
        {'pos': 'CB', 'x': 70.0, 'y': 76.0},
        {'pos': 'RB', 'x': 88.0, 'y': 68.0},
        {'pos': 'CMF', 'x': 28.0, 'y': 48.0},
        {'pos': 'DMF', 'x': 50.0, 'y': 52.0},
        {'pos': 'CMF', 'x': 72.0, 'y': 48.0},
        {'pos': 'CF', 'x': 38.0, 'y': 18.0},
        {'pos': 'CF', 'x': 62.0, 'y': 18.0},
    ],
}

DEFAULT_TEAM_FORMATIONS = {
    'AC Milan': '4-5-1 (4-2-3-1)',
    'Arsenal': '4-3-3 (4-2-1-3)',
    'Atlético Madrid': '5-3-2 (5-3-2)',
    'BVB Borussia Dortmund': '4-5-1 (4-2-3-1)',
    'Chelsea': '4-5-1 (4-2-3-1)',
    'FC Barcelona': '4-3-3 (4-2-1-3)',
    'FC Bayern München': '4-5-1 (4-2-3-1)',
    'Inter': '3-5-2 (3-2-3-2)',
    'Juventus': '3-5-2 (3-2-3-2)',
    'Liverpool': '4-3-3 (4-2-1-3)',
    'Manchester City': '3-6-1 (3-2-4-1)',
    'Manchester United': '4-5-1 (4-2-3-1)',
    'Newcastle United': '4-3-3 (4-2-1-3)',
    'Paris Saint-Germain': '4-3-3 (4-2-1-3)',
    'Real Madrid': '4-4-2 (4-3-1-2)',
    'Tottenham Hotspur': '4-5-1 (4-2-3-1)',
}

POSITION_FALLBACKS = {
    'GK': ['GK'],
    'CB': ['CB', 'LB', 'RB', 'DMF'],
    'LB': ['LB', 'LMF', 'CB', 'RB'],
    'RB': ['RB', 'RMF', 'CB', 'LB'],
    'DMF': ['DMF', 'CMF', 'CB'],
    'CMF': ['CMF', 'AMF', 'DMF', 'LMF', 'RMF'],
    'AMF': ['AMF', 'CMF', 'SS', 'LWF', 'RWF'],
    'LMF': ['LMF', 'LWF', 'CMF', 'LB'],
    'RMF': ['RMF', 'RWF', 'CMF', 'RB'],
    'LWF': ['LWF', 'LMF', 'SS', 'CF', 'AMF'],
    'RWF': ['RWF', 'RMF', 'SS', 'CF', 'AMF'],
    'SS': ['SS', 'CF', 'AMF', 'LWF', 'RWF'],
    'CF': ['CF', 'SS', 'LWF', 'RWF', 'AMF'],
}


def resolve_formation_preset(formation_name: str) -> tuple[str, list]:
    if formation_name in FORMATION_PRESETS:
        return formation_name, FORMATION_PRESETS[formation_name]
    for key, preset in FORMATION_PRESETS.items():
        if key.startswith(formation_name) or formation_name in key:
            return key, preset
    return '4-3-3 (4-2-1-3)', FORMATION_PRESETS['4-3-3 (4-2-1-3)']


def auto_assign_team_starting_lineup(team: Team, formation_name: str = None) -> list[Player]:
    """
    Selects 11 starters matching the tactical slots of the formation,
    assigns them is_starting=True, calculates coordinates (x_coord, y_coord),
    routes remaining players to bench (11 players) and reserves with is_starting=False,
    and assigns clean shirt numbers.
    """
    if not formation_name:
        formation_name = DEFAULT_TEAM_FORMATIONS.get(team.name, team.default_formation or '4-3-3 (4-2-1-3)')
    
    full_formation_key, slots = resolve_formation_preset(formation_name)
    team.default_formation = full_formation_key
    team.save(update_fields=['default_formation'])

    gameplan, _ = TeamGamePlan.objects.get_or_create(team=team)
    gameplan.formation = full_formation_key
    gameplan.save(update_fields=['formation'])

    all_players = list(Player.objects.filter(team=team).order_by('-overall'))
    if not all_players:
        return []

    available = list(all_players)
    assigned_starters: list[tuple[Player, dict]] = []

    # Assign 11 starting slots based on position preferences
    for slot in slots:
        target_pos = slot['pos']
        candidate = None
        
        # Priority 1: Exact position match
        exact_matches = [p for p in available if p.position == target_pos]
        if exact_matches:
            candidate = max(exact_matches, key=lambda p: p.overall)
        
        # Priority 2: Position group fallbacks
        if not candidate:
            fallbacks = POSITION_FALLBACKS.get(target_pos, [])
            for fallback_pos in fallbacks:
                fallback_matches = [p for p in available if p.position == fallback_pos]
                if fallback_matches:
                    candidate = max(fallback_matches, key=lambda p: p.overall)
                    break
        
        # Priority 3: Best overall available non-GK (unless slot is GK)
        if not candidate:
            if target_pos == 'GK':
                gk_matches = [p for p in available if p.position == 'GK']
                if gk_matches:
                    candidate = max(gk_matches, key=lambda p: p.overall)
            else:
                non_gks = [p for p in available if p.position != 'GK']
                if non_gks:
                    candidate = max(non_gks, key=lambda p: p.overall)
        
        # Fallback 4: Any available
        if not candidate and available:
            candidate = available[0]

        if candidate:
            available.remove(candidate)
            assigned_starters.append((candidate, slot))

    # Persist Starters with exact pitch coordinates and is_starting=True
    starter_ids = set()
    used_numbers = set()

    for idx, (player, slot) in enumerate(assigned_starters):
        player.is_starting = True
        player.x_coord = slot['x']
        player.y_coord = slot['y']
        
        # Shirt number assignment: GK gets 1, others get 2..11 if not set
        if not player.shirt_number or player.shirt_number in used_numbers:
            if slot['pos'] == 'GK':
                num = 1
            else:
                num = idx + 1 if idx + 1 != 1 else 12
            while num in used_numbers:
                num += 1
            player.shirt_number = num
        used_numbers.add(player.shirt_number)
        
        player.save()
        starter_ids.add(player.id)

    # Persist Bench & Reserves with is_starting=False
    sub_num = 12
    for player in all_players:
        if player.id not in starter_ids:
            player.is_starting = False
            if not player.shirt_number or player.shirt_number in used_numbers:
                while sub_num in used_numbers:
                    sub_num += 1
                player.shirt_number = sub_num
                used_numbers.add(sub_num)
                sub_num += 1
            player.save()

    return list(Player.objects.filter(team=team))


def align_all_teams():
    for team in Team.objects.all():
        auto_assign_team_starting_lineup(team)
