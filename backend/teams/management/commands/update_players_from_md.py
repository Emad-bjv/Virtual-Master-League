import sys
import re
import unicodedata
from django.core.management.base import BaseCommand
from teams.models import Team, Player

# Ensure stdout supports unicode characters on Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


TEAM_NAME_ALIASES = {
    'psg': ['Paris Saint-Germain', 'PSG'],
    'bvb': ['BVB Borussia Dortmund', 'Borussia Dortmund', 'BVB'],
    'milan': ['AC Milan', 'Milan'],
    'inter': ['Inter', 'Inter Milan', 'FC Internazionale'],
    'barcelona': ['FC Barcelona', 'Barcelona', 'Barca'],
    'atletico madrid': ['Atlético Madrid', 'Atletico Madrid', 'Atletico de Madrid', 'Atlético'],
    'atletico': ['Atlético Madrid', 'Atletico Madrid', 'Atlético'],
    'napoli': ['SSC Napoli', 'Napoli'],
    'newcastle': ['Newcastle United', 'Newcastle'],
    'tottenham': ['Tottenham Hotspur', 'Tottenham', 'Spurs'],
    'real madrid': ['Real Madrid'],
    'manchester city': ['Manchester City', 'Man City'],
    'manchester united': ['Manchester United', 'Man United', 'Man Utd'],
    'liverpool': ['Liverpool'],
    'juventus': ['Juventus', 'Juve'],
    'chelsea': ['Chelsea'],
    'roma': ['AS Roma', 'Roma'],
}


def normalize_str(s):
    """Normalize unicode characters, accents, hyphens, and whitespace."""
    if not s:
        return ''
    s = unicodedata.normalize('NFKD', str(s))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.replace('.', ' ').replace('-', ' ').replace("'", '')
    s = re.sub(r'\s+', ' ', s)
    return s.strip().lower()


def find_team(md_team_name, all_teams):
    """
    Attempt to find a matching Team object using multiple strategies:
    1. Exact match (normalized)
    2. Alias lookup
    3. Substring/contains match (normalized)
    4. Significant word overlap
    """
    norm_md = normalize_str(md_team_name)

    # Strategy 1: Exact normalized match
    for team in all_teams:
        if normalize_str(team.name) == norm_md:
            return team

    # Strategy 2: Alias lookup
    if norm_md in TEAM_NAME_ALIASES:
        for alias in TEAM_NAME_ALIASES[norm_md]:
            norm_alias = normalize_str(alias)
            for team in all_teams:
                if normalize_str(team.name) == norm_alias:
                    return team

    # Strategy 3: Substring contains (bidirectional)
    for team in all_teams:
        norm_db = normalize_str(team.name)
        if norm_md in norm_db or norm_db in norm_md:
            return team

    # Strategy 4: Word overlap (ignoring common club prefixes)
    stop_words = {'fc', 'sc', 'ac', 'as', 'ssc', 'cf', 'united', 'city', 'hotspur', 'borussia', 'de', 'saint', 'germain'}
    md_words = set(norm_md.split()) - stop_words
    for team in all_teams:
        db_words = set(normalize_str(team.name).split()) - stop_words
        if md_words and db_words and (md_words & db_words):
            return team

    return None


def match_player_in_list(target_name, player_list):
    """Match player by name in a list of Player instances."""
    norm_target = normalize_str(target_name)
    target_parts = norm_target.split()

    # 1. Exact normalized match
    for p in player_list:
        if normalize_str(p.name) == norm_target:
            return p

    # 2. Match with last name + first initial (e.g. "A. Buongiorno" vs "Alessandro Buongiorno")
    for p in player_list:
        p_norm = normalize_str(p.name)
        p_parts = p_norm.split()
        if len(target_parts) >= 2 and len(p_parts) >= 2:
            # Last names match and first initial matches
            if target_parts[-1] == p_parts[-1] and target_parts[0][0] == p_parts[0][0]:
                return p

    # 3. Match by last name if unique in candidate list
    if len(target_parts) >= 1:
        last_name = target_parts[-1]
        if len(last_name) >= 3:  # avoid matching single letter
            candidates = [p for p in player_list if normalize_str(p.name).endswith(last_name)]
            if len(candidates) == 1:
                return candidates[0]

    return None


def parse_md_file(filepath):
    """
    Parse the corrected players markdown file.
    Returns a list of (team_name, players_list) tuples.
    """
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    teams = []
    team_sections = re.split(r'^## (.+)$', content, flags=re.MULTILINE)

    for i in range(1, len(team_sections), 2):
        team_name = team_sections[i].strip()
        section_content = team_sections[i + 1] if i + 1 < len(team_sections) else ''

        players = []
        for line in section_content.split('\n'):
            line = line.strip()
            if not line.startswith('|'):
                continue
            cells = [c.strip() for c in line.split('|')]
            cells = [c for c in cells if c]

            if len(cells) < 5:
                continue
            if cells[0].startswith('---') or cells[0].startswith('?'):
                continue
            if not cells[0].startswith('#'):
                continue

            try:
                player_name = cells[1].strip()
                primary_position = cells[2].strip()
                compatible_positions_raw = cells[3].strip()
                age = int(cells[4].strip())

                compat_list = [p.strip() for p in compatible_positions_raw.split(',') if p.strip()]
                compatible_positions = ','.join(compat_list)

                players.append({
                    'name': player_name,
                    'position': primary_position,
                    'compatible_positions': compatible_positions,
                    'age': age,
                })
            except (ValueError, IndexError):
                continue

        teams.append((team_name, players))

    return teams


class Command(BaseCommand):
    help = (
        'Update player position, compatible_positions, and age from a corrected '
        'Markdown file. Matches players by name + team using fuzzy & accent-insensitive matching.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'filepath',
            type=str,
            help='Path to the All_players_corrected.md file',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Parse and show what would be updated without writing to the database.',
        )

    def handle(self, *args, **options):
        filepath = options['filepath']
        dry_run = options['dry_run']

        self.stdout.write(self.style.NOTICE(f'Parsing file: {filepath}'))
        if dry_run:
            self.stdout.write(self.style.WARNING('=== DRY RUN MODE -- no changes will be written ===\n'))

        teams_data = parse_md_file(filepath)
        all_teams = list(Team.objects.all())
        all_db_players = list(Player.objects.all())

        total_updated = 0
        total_skipped_player = 0
        total_skipped_team = 0
        skipped_teams = []
        skipped_players = []

        for md_team_name, players in teams_data:
            team = find_team(md_team_name, all_teams)

            if not team:
                self.stdout.write(self.style.ERROR(
                    f'[ERROR] Team NOT FOUND: "{md_team_name}" -- {len(players)} players skipped'
                ))
                skipped_teams.append(md_team_name)
                total_skipped_team += len(players)
                continue

            self.stdout.write(self.style.SUCCESS(
                f'\n[OK] Team matched: "{md_team_name}" -> DB: "{team.name}" (id={team.id})'
            ))

            team_players = [p for p in all_db_players if p.team_id == team.id]

            for player_data in players:
                # 1. Match within current team
                matched = match_player_in_list(player_data['name'], team_players)

                # 2. Fallback: Match across entire database (if player transferred / roster mismatch)
                matched_global = False
                if not matched:
                    matched = match_player_in_list(player_data['name'], all_db_players)
                    if matched:
                        matched_global = True

                if not matched:
                    self.stdout.write(self.style.WARNING(
                        f'  [WARN] Player NOT FOUND in DB: "{player_data["name"]}" (Team: {md_team_name})'
                    ))
                    skipped_players.append(f'{player_data["name"]} ({md_team_name})')
                    total_skipped_player += 1
                    continue

                changes = []
                if matched.position != player_data['position']:
                    changes.append(f'pos: {matched.position}->{player_data["position"]}')
                if matched.age != player_data['age']:
                    changes.append(f'age: {matched.age}->{player_data["age"]}')
                old_compat = getattr(matched, 'compatible_positions', '') or ''
                if old_compat != player_data['compatible_positions']:
                    changes.append(f'compat: "{old_compat}"->"{player_data["compatible_positions"]}"')

                global_tag = f' [found in DB under {matched.team.name if matched.team else "Free Agent"}]' if matched_global else ''

                if changes:
                    if not dry_run:
                        matched.position = player_data['position']
                        matched.age = player_data['age']
                        matched.compatible_positions = player_data['compatible_positions']
                        matched.save(update_fields=['position', 'age', 'compatible_positions'])

                    changes_str = ', '.join(changes)
                    self.stdout.write(f'  [UPDATE] {matched.name}{global_tag}: {changes_str}')
                    total_updated += 1
                else:
                    self.stdout.write(f'  [OK]     {matched.name}{global_tag}: up to date')

        # -- Summary Report --
        self.stdout.write('')
        self.stdout.write(self.style.NOTICE('=' * 60))
        self.stdout.write(self.style.NOTICE('  SUMMARY REPORT'))
        self.stdout.write(self.style.NOTICE('=' * 60))
        self.stdout.write(f'  Teams in file:          {len(teams_data)}')
        self.stdout.write(f'  Teams matched:          {len(teams_data) - len(skipped_teams)}')
        self.stdout.write(f'  Teams NOT found:        {len(skipped_teams)}')
        self.stdout.write(f'  Players in file:        {sum(len(p) for _, p in teams_data)}')
        self.stdout.write(f'  Players updated/synced: {total_updated}')
        self.stdout.write(f'  Players NOT found:      {total_skipped_player}')
        self.stdout.write(f'  Players skipped (team): {total_skipped_team}')

        if skipped_teams:
            self.stdout.write(self.style.ERROR('\n  Unmatched Teams:'))
            for t in skipped_teams:
                self.stdout.write(self.style.ERROR(f'    - {t}'))

        if skipped_players:
            self.stdout.write(self.style.WARNING(f'\n  Unmatched Players ({len(skipped_players)}):'))
            for p in skipped_players:
                self.stdout.write(self.style.WARNING(f'    - {p}'))

        if dry_run:
            self.stdout.write(self.style.WARNING('\n  >>> DRY RUN COMPLETE -- no changes were written to the database.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n  [SUCCESS] Done! {total_updated} players updated in database.'))
