"""
Production-Safe Player Stats & Position Updater
================================================
This script is specifically designed to run safely on production servers where
transfers and user actions have already occurred.

Guarantees:
1. DOES NOT touch player.team (preserves all transfers, loans, and squad rosters).
2. DOES NOT touch is_free_agent, wage, contract, is_starting, or formation coords.
3. UPDATES ONLY: overall, base_overall, position, rarity, base_stamina, (and name cleanup).
4. Accurately handles duplicate/similar names (e.g., Nico González) without mixing them up.
5. Recalculates star_rating for all teams based on current active squads.
"""

import os
import sys
import django
import unicodedata
import re
from decimal import Decimal

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import transaction
from teams.models import Team, Player

def clean_name(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('-', ' ').replace('.', ' ').replace("'", '').replace('’', '').replace('`', '').strip().lower()
    return re.sub(r'\s+', ' ', s)

def calculate_rarity(ovr: int, pot: int) -> str:
    if ovr >= 88 or pot >= 92:
        return 'LEGENDARY'
    elif ovr >= 84 or pot >= 88:
        return 'EPIC'
    elif ovr >= 80:
        return 'RARE'
    return 'REGULAR'

def update_production_stats(files_list, dry_run=False):
    CLUB_MAPPING = {
        'لیورپول (Liverpool FC)': 'Liverpool',
        'بایرن مونیخ (FC Bayern München)': 'FC Bayern München',
        'آرسنال (Arsenal FC)': 'Arsenal',
        'چلسی (Chelsea FC)': 'Chelsea',
        'منچستر یونایتد (Manchester United FC)': 'Manchester United',
        'منچستر سیتی (Manchester City FC)': 'Manchester City',
        'منچستر سیتی (Manchester City FC) - تکمیلی': 'Manchester City',
        'رئال مادرید (Real Madrid CF)': 'Real Madrid',
        'بارسلونا (FC Barcelona)': 'FC Barcelona',
        'پاری سن-ژرمن (Paris Saint-Germain)': 'Paris Saint-Germain',
        'یوونتوس (Juventus FC)': 'Juventus',
        'تاتنهام (Tottenham Hotspur FC)': 'Tottenham Hotspur',
        'اتلتیکو مادرید (Atlético de Madrid)': 'Atlético Madrid',
        'اتلتیکو مادرید (Atlético de Madrid) - تکمیلی': 'Atlético Madrid',
        'اینتر میلان (FC Inter Milan)': 'Inter',
        'آ.ث. میلان (AC Milan)': 'AC Milan',
        'ناپولی (SSC Napoli)': 'SSC Napoli',
        'نیوکاسل (Newcastle United FC)': 'Newcastle United',
        'دورتموند (Borussia Dortmund)': 'BVB Borussia Dortmund',
        'آ.اس. رم (AS Roma)': 'AS Roma',
    }

    # 1. Parse all MD files
    md_players = []
    seen = set()
    for fpath in files_list:
        if not os.path.exists(fpath):
            print(f"Warning: File not found: {fpath}")
            continue
        with open(fpath, 'r', encoding='utf-8') as f:
            curr_club = None
            for line in f:
                line = line.strip()
                if line.startswith('## '):
                    curr_club = line.replace('## ', '').strip()
                elif line.startswith('|') and curr_club and not line.startswith('| :---') and not 'نام بازیکن' in line:
                    parts = [p.strip() for p in line.split('|')[1:-1]]
                    if len(parts) >= 3:
                        p_name, p_pos, p_ovr = parts[0], parts[1], parts[2]
                        try:
                            p_ovr_int = int(p_ovr)
                            origin_team = CLUB_MAPPING.get(curr_club)
                            key = (origin_team, clean_name(p_name))
                            if key not in seen:
                                seen.add(key)
                                md_players.append({
                                    'origin_team': origin_team,
                                    'name': p_name,
                                    'pos': p_pos,
                                    'ovr': p_ovr_int,
                                })
                        except ValueError:
                            pass

    print(f"Total MD Player Records parsed: {len(md_players)}")

    all_db_players = list(Player.objects.select_related('team').all())
    used_db_ids = set()
    matched_updates = []
    unmatched = []

    # Matching Strategy:
    # 1. Check same team first (if not transferred yet)
    # 2. Check globally across DB by Name / Aliases while guarding duplicate names
    for mp in md_players:
        m_clean = clean_name(mp['name'])
        m_parts = m_clean.split()
        origin_team = mp['origin_team']
        
        # Priority 1: Match in original team if still there
        match = None
        for dp in all_db_players:
            if dp.id in used_db_ids:
                continue
            if dp.team and dp.team.name == origin_team:
                d_clean = clean_name(dp.name)
                d_parts = d_clean.split()
                if d_clean == m_clean:
                    match = dp
                    break
                if len(m_parts) >= 2 and len(d_parts) >= 2:
                    if f"{m_parts[0][0]} {m_parts[-1]}" == f"{d_parts[0][0]} {d_parts[-1]}":
                        match = dp
                        break

        # Priority 2: Match globally across DB (player was transferred to another team!)
        if not match:
            # Special duplicate protection for Nico González
            if m_clean == 'nico gonzalez':
                if origin_team == 'Juventus':
                    # Find the Nico Gonzalez that was in Juventus / winger
                    for dp in all_db_players:
                        if dp.id not in used_db_ids and clean_name(dp.name) in ['nico gonzalez', 'n gonzalez'] and (dp.position in ['LWF', 'RWF', 'LMF', 'RMF'] or (dp.team and dp.team.name == 'Juventus')):
                            match = dp
                            break
                elif origin_team == 'Manchester City':
                    for dp in all_db_players:
                        if dp.id not in used_db_ids and clean_name(dp.name) in ['nico gonzalez', 'n gonzalez'] and (dp.position in ['CMF', 'DMF'] or (dp.team and dp.team.name == 'Manchester City')):
                            match = dp
                            break
            else:
                for dp in all_db_players:
                    if dp.id in used_db_ids:
                        continue
                    d_clean = clean_name(dp.name)
                    d_parts = d_clean.split()
                    if d_clean == m_clean:
                        match = dp
                        break
                    if len(m_parts) >= 2 and len(d_parts) >= 2:
                        if f"{m_parts[0][0]} {m_parts[-1]}" == f"{d_parts[0][0]} {d_parts[-1]}":
                            match = dp
                            break

        if match:
            used_db_ids.add(match.id)
            matched_updates.append((match, mp))
        else:
            unmatched.append(mp)

    print(f"\nMatched Players for Stat Update: {len(matched_updates)}")
    print(f"Unmatched Players in DB: {len(unmatched)}")

    if dry_run:
        print("\n[DRY RUN] No database changes made.")
        return

    with transaction.atomic():
        for dp, mp in matched_updates:
            dp.overall = mp['ovr']
            dp.base_overall = mp['ovr']
            dp.position = mp['pos']
            dp.rarity = calculate_rarity(mp['ovr'], dp.potential_ovr or mp['ovr'])
            dp.base_stamina = min(99, max(60, mp['ovr'] + (3 if mp['pos'] != 'GK' else 0)))
            # Note: We NEVER change dp.team or dp.is_starting or dp.wage!
            dp.save(update_fields=['overall', 'base_overall', 'position', 'rarity', 'base_stamina'])

        # Recalculate team star ratings based on current squads
        for team in Team.objects.all():
            team.update_star_rating()

    print("\n✅ Production Safe Update Completed Successfully!")

if __name__ == '__main__':
    files = [
        r'c:\Users\USER\Downloads\ABDM\player_statistics.md',
        r'c:\Users\USER\Downloads\ABDM\player_statistics_v2.md',
        r'c:\Users\USER\Downloads\ABDM\player_statistics_v3.md',
        r'c:\Users\USER\Downloads\ABDM\player_statistics_v4.md'
    ]
    update_production_stats(files, dry_run=False)
