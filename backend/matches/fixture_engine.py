import datetime
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from .models import Match, Tournament, LeagueStanding, Season
from teams.models import Team

# 8 Strictly Sequential Daily Time Slots (No concurrent matches)
# Evening schedule: 18:00 to ~23:45 — each match slot ~75 min apart
DAILY_TIME_SLOTS = [
    (18, 0),   # 18:00
    (18, 50),  # 18:50
    (19, 40),  # 19:40
    (20, 30),  # 20:30
    (21, 15),  # 21:15
    (22, 0),   # 22:00
    (22, 45),  # 22:45
    (23, 30),  # 23:30
]

DEFAULT_START_DATE = datetime.date(2026, 8, 28)  # 7 Shahrivar 1405


def generate_league_fixtures(tournament, teams=None, start_date=None, days_between_rounds=1, clear_existing=False):
    """
    Generates a full double round-robin schedule (home and away) for the given teams.
    Scheduling Rules:
    - Kickoff Date: August 28, 2026 (7 Shahrivar) by default.
    - Daily Match Limit: Exactly 8 matches per day (1 matchday/round per day for 16 teams).
    - Strictly Sequential Time Slots: 18:00, 18:50, 19:40, 20:30, 21:15, 22:00, 22:45, 23:30.
    - Zero concurrent matches.
    - Double Round-Robin: 16 teams = 30 Matchdays (240 matches).
    """
    if teams is None:
        teams = Team.objects.all().order_by('id')

    team_list = list(teams)
    if len(team_list) < 2:
        return 0

    if start_date is None:
        start_date = DEFAULT_START_DATE
    elif isinstance(start_date, datetime.datetime):
        start_date = start_date.date()

    # If odd number of teams, add a dummy "bye" team
    if len(team_list) % 2 != 0:
        team_list.append(None)

    num_teams = len(team_list)
    num_rounds = num_teams - 1
    half_size = num_teams // 2

    # Get local timezone or default to UTC/Tehran
    current_tz = timezone.get_current_timezone()

    matches_to_create = []

    with transaction.atomic():
        if clear_existing:
            Match.objects.filter(tournament=tournament).delete()

        # Initialize or ensure LeagueStandings for all participating teams
        for t in team_list:
            if t is not None:
                LeagueStanding.objects.get_or_create(
                    tournament=tournament,
                    team=t,
                    defaults={
                        'played': 0, 'won': 0, 'drawn': 0, 'lost': 0,
                        'goals_for': 0, 'goals_against': 0, 'points': 0
                    }
                )

        # Working copy of the teams for circle rotation
        rotation_list = list(team_list)

        # Generate both halves of the season (Home & Away)
        for half in [1, 2]:
            for round_num in range(num_rounds):
                week_number = (half - 1) * num_rounds + round_num + 1
                match_day = start_date + timedelta(days=(week_number - 1) * days_between_rounds)
                round_name = f"هفته {week_number}"

                round_matches = []
                for i in range(half_size):
                    team1 = rotation_list[i]
                    team2 = rotation_list[num_teams - 1 - i]

                    # Skip dummy bye teams if odd count
                    if team1 is None or team2 is None:
                        continue

                    # Alternating home/away balance
                    swap = False
                    if i == 0:
                        if round_num % 2 == 1:
                            swap = True
                    else:
                        if round_num % 2 == 0:
                            swap = True

                    if half == 2:
                        swap = not swap

                    home_team = team2 if swap else team1
                    away_team = team1 if swap else team2

                    round_matches.append((home_team, away_team))

                # Assign sequential time slots to matches in this round
                for slot_idx, (h_team, a_team) in enumerate(round_matches):
                    slot_hour, slot_min = DAILY_TIME_SLOTS[slot_idx % len(DAILY_TIME_SLOTS)]
                    naive_dt = datetime.datetime.combine(match_day, datetime.time(slot_hour, slot_min))
                    slot_dt = timezone.make_aware(naive_dt, current_tz) if timezone.is_naive(naive_dt) else naive_dt

                    match = Match(
                        tournament=tournament,
                        home_team=h_team,
                        away_team=a_team,
                        date=slot_dt,
                        round_name=round_name,
                        status='SCHEDULED',
                        half_status='NOT_STARTED',
                        is_knockout=False,
                        standings_processed=False
                    )
                    matches_to_create.append(match)

                # Rotate teams for the next round (keep index 0 fixed)
                rotation_list.insert(1, rotation_list.pop())

        Match.objects.bulk_create(matches_to_create)

    return len(matches_to_create)


def ensure_league_and_fixtures(tournament_name="مستر لیگ مجازی", start_date=None, clear_existing=True):
    """
    Utility function to guarantee an active LEAGUE tournament exists and has 
    the full 30-round sequential fixture schedule generated.
    """
    season, _ = Season.objects.get_or_create(
        is_active=True,
        defaults={'name': 'فصل ۱۴۰۵', 'started_at': timezone.now()}
    )

    tournament, _ = Tournament.objects.get_or_create(
        name=tournament_name,
        tournament_type='LEAGUE',
        defaults={'season': season, 'is_active': True}
    )

    teams = Team.objects.all().order_by('id')
    if teams.count() >= 2:
        count = generate_league_fixtures(
            tournament=tournament,
            teams=teams,
            start_date=start_date or DEFAULT_START_DATE,
            days_between_rounds=1,
            clear_existing=clear_existing
        )
        return tournament, count

    return tournament, 0
