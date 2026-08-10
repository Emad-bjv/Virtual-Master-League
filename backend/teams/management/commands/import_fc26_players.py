import os
import re
import json
from decimal import Decimal
from django.core.management.base import BaseCommand
from teams.models import Team, Player, ClubFacilities

LOGO_MAP = {
    'AC Milan': 'italy_milan_3000x3000.football-logos.cc.png',
    'Arsenal': 'england_arsenal_3000x3000.football-logos.cc.png',
    'Atlético Madrid': 'spain_atletico-madrid_3000x3000.football-logos.cc.png',
    'BVB Borussia Dortmund': 'germany_borussia-dortmund_3000x3000.football-logos.cc.png',
    'Chelsea': 'england_chelsea_3000x3000.football-logos.cc.png',
    'FC Barcelona': 'spain_barcelona_3000x3000.football-logos.cc.png',
    'FC Bayern München': 'germany_bayern-munchen_3000x3000.football-logos.cc.png',
    'Inter': 'italy_inter_3000x3000.football-logos.cc.png',
    'Juventus': 'italy_juventus_3000x3000.football-logos.cc.png',
    'Liverpool': 'england_liverpool_3000x3000.football-logos.cc.png',
    'Manchester City': 'england_manchester-city_3000x3000.football-logos.cc.png',
    'Manchester United': 'england_manchester-united_3000x3000.football-logos.cc.png',
    'Newcastle United': 'england_newcastle_3000x3000.football-logos.cc.png',
    'Paris Saint-Germain': 'france_paris-saint-germain_3000x3000.football-logos.cc.png',
    'Real Madrid': 'spain_real-madrid_3000x3000.football-logos.cc.png',
    'Tottenham Hotspur': 'england_tottenham_3000x3000.football-logos.cc.png',
}

POS_MAP = {
    'GK': 'GK',
    'CB': 'CB',
    'LB': 'LB',
    'RB': 'RB',
    'CDM': 'DMF',
    'CM': 'CMF',
    'LM': 'LMF',
    'RM': 'RMF',
    'CAM': 'AMF',
    'LW': 'LWF',
    'RW': 'RWF',
    'ST': 'CF',
    'SS': 'SS',
}


class Command(BaseCommand):
    help = 'Import FC 26 teams and players from Markdown file into database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=r'c:\Users\USER\Downloads\اطلاعات کامل بازیکنان - FC 26.md',
            help='Path to FC 26 markdown file'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing teams and players imported from FC 26 before importing'
        )
        parser.add_argument(
            '--json-output',
            type=str,
            default=None,
            help='Path to export parsed data as JSON fixture'
        )

    def parse_money(self, val_str: str, is_wage: bool = False) -> float:
        val_str = val_str.replace('€', '').strip()
        if not val_str:
            return 0.0
        
        # Handle Foden wage typo (€172.5M -> 172.5K)
        if is_wage and val_str.endswith('M'):
            val_str = val_str[:-1] + 'K'

        mult = 1.0
        if val_str.endswith('M') or val_str.endswith('m'):
            mult = 1000000.0
            val_str = val_str[:-1]
        elif val_str.endswith('K') or val_str.endswith('k'):
            mult = 1000.0
            val_str = val_str[:-1]
            
        try:
            return float(val_str) * mult
        except ValueError:
            return 0.0

    def clean_position(self, pos_str: str) -> str:
        # Replace Cyrillic unicode characters
        pos_str = pos_str.replace('\u0421\u0412', 'CB').replace('\u0421\u041c', 'CM')
        pos_str = pos_str.replace('СВ', 'CB').replace('СМ', 'CM').strip()
        
        tokens = pos_str.split()
        if not tokens:
            return 'CMF'
            
        first_pos = tokens[0]
        return POS_MAP.get(first_pos, 'CMF')

    def calculate_rarity(self, ovr: int, pot: int) -> str:
        if ovr >= 88 or pot >= 92:
            return 'LEGENDARY'
        elif ovr >= 84 or pot >= 88:
            return 'EPIC'
        elif ovr >= 80:
            return 'RARE'
        return 'REGULAR'

    def handle(self, *args, **options):
        file_path = options['file']
        clear = options['clear']
        json_output = options['json_output']

        if not os.path.exists(file_path):
            self.stderr.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        table_lines = [l.strip() for l in lines if l.strip().startswith('|') and not l.strip().startswith('| :') and not 'نام' in l]

        self.stdout.write(f"Found {len(table_lines)} player entries in markdown table.")

        if clear:
            team_names = list(LOGO_MAP.keys())
            deleted_players, _ = Player.objects.filter(team__name__in=team_names).delete()
            deleted_teams, _ = Team.objects.filter(name__in=team_names).delete()
            self.stdout.write(self.style.SUCCESS(f"Cleared {deleted_teams} teams and {deleted_players} players."))

        parsed_teams = {}
        parsed_players = []

        for line in table_lines:
            parts = [p.strip() for p in line.split('|')[1:-1]]
            if len(parts) < 9:
                continue

            name, age_str, ovr_str, pot_str, pos_str, club_name, contract, value_str, wage_str = parts[:9]

            try:
                age = int(age_str)
                ovr = int(ovr_str)
                pot = int(pot_str)
            except ValueError:
                continue

            pos_choice = self.clean_position(pos_str)
            wage_val = self.parse_money(wage_str, is_wage=True)
            value_val = self.parse_money(value_str, is_wage=False)
            rarity = self.calculate_rarity(ovr, pot)
            base_stamina = min(99, max(60, ovr + (3 if pos_choice != 'GK' else 0)))

            if club_name not in parsed_teams:
                parsed_teams[club_name] = []

            player_data = {
                'name': name,
                'age': age,
                'position': pos_choice,
                'overall': ovr,
                'potential_ovr': pot,
                'base_stamina': base_stamina,
                'virtual_stamina': Decimal('100.00'),
                'wage': Decimal(str(wage_val)),
                'rarity': rarity,
                'contract': contract,
                'market_value': Decimal(str(value_val))
            }
            parsed_teams[club_name].append(player_data)
            parsed_players.append((club_name, player_data))

        # DB Import
        created_team_count = 0
        created_player_count = 0

        fixture_export = []

        for team_name, players in parsed_teams.items():
            logo_file = LOGO_MAP.get(team_name, '')
            team, created = Team.objects.get_or_create(
                name=team_name,
                defaults={
                    'logo': f"Team Logos/{logo_file}" if logo_file else "",
                    'budget': Decimal('500000000.00'),
                    'wage_cap': Decimal('5000000.00'),
                    'academy_level': 3
                }
            )
            if created:
                created_team_count += 1
                ClubFacilities.objects.get_or_create(
                    team=team,
                    defaults={
                        'stadium_level': 3,
                        'academy_level': 3,
                        'medical_level': 3,
                        'gym_level': 3,
                        'scouting_level': 3,
                        'training_camp_level': 3
                    }
                )
            else:
                # Ensure facilities exist
                ClubFacilities.objects.get_or_create(team=team)

            # Fixture representation for team
            fixture_export.append({
                'model': 'teams.team',
                'pk': team.id,
                'fields': {
                    'name': team.name,
                    'logo': team.logo,
                    'budget': str(team.budget),
                    'wage_cap': str(team.wage_cap),
                    'academy_level': team.academy_level
                }
            })

            for pdata in players:
                player, p_created = Player.objects.update_or_create(
                    team=team,
                    name=pdata['name'],
                    defaults={
                        'age': pdata['age'],
                        'position': pdata['position'],
                        'overall': pdata['overall'],
                        'potential_ovr': pdata['potential_ovr'],
                        'base_stamina': pdata['base_stamina'],
                        'virtual_stamina': pdata['virtual_stamina'],
                        'wage': pdata['wage'],
                        'rarity': pdata['rarity'],
                    }
                )
                if p_created:
                    created_player_count += 1

                fixture_export.append({
                    'model': 'teams.player',
                    'pk': player.id,
                    'fields': {
                        'team': team.id,
                        'name': player.name,
                        'age': player.age,
                        'position': player.position,
                        'overall': player.overall,
                        'potential_ovr': player.potential_ovr,
                        'base_stamina': player.base_stamina,
                        'virtual_stamina': str(player.virtual_stamina),
                        'wage': str(player.wage),
                        'rarity': player.rarity
                    }
                })

        self.stdout.write(self.style.SUCCESS(
            f"Successfully processed {len(parsed_teams)} teams and {len(parsed_players)} players. "
            f"Database total teams: {Team.objects.filter(name__in=list(parsed_teams.keys())).count()}, "
            f"total FC 26 players: {Player.objects.filter(team__name__in=list(parsed_teams.keys())).count()}"
        ))

        # JSON Fixture Export if requested
        if json_output:
            out_dir = os.path.dirname(json_output)
            if out_dir and not os.path.exists(out_dir):
                os.makedirs(out_dir, exist_ok=True)
            with open(json_output, 'w', encoding='utf-8') as jf:
                json.dump(fixture_export, jf, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f"Exported JSON fixture to: {json_output}"))
