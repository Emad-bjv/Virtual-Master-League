import datetime
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from .models import Match, Tournament, LeagueStanding, Season
from teams.models import Team

# 8 Strictly Sequential Daily Time Slots (No concurrent matches)
# Evening schedule: 18:00 to ~23:45 — each match slot ~45-50 min apart
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


def generate_league_fixtures(
    tournament,
    teams=None,
    start_date=None,
    days_between_rounds=1,
    time_slots=None,
    is_double_round_robin=True,
    reserve_cup_days=True,
    interval_gameweeks=6,
    clear_existing=False
):
    """
    Generates a round-robin schedule (single or double) for the given teams.
    When reserve_cup_days is True:
      - Every N gameweeks (interval_gameweeks, e.g. 6) are played consecutively day-by-day.
      - After each block of N gameweeks, exactly 1 day is left open/reserved for a stage of the Knockout Cup.
      - The very next day after the Cup matchday, the next league gameweek begins.
      - Works dynamically with ANY start date (Monday, Saturday, Wednesday, etc.).
    """
    if teams is None:
        teams = Team.objects.all().order_by('id')

    import random

    team_list = list(teams)
    if len(team_list) < 2:
        return 0

    # Shuffle the initial team seed for a realistic, non-deterministic draw
    random.shuffle(team_list)

    if start_date is None:
        start_date = DEFAULT_START_DATE
    elif isinstance(start_date, datetime.datetime):
        start_date = start_date.date()

    if not time_slots:
        time_slots = DAILY_TIME_SLOTS

    # If odd number of teams, add a dummy "bye" team
    if len(team_list) % 2 != 0:
        team_list.append(None)

    num_teams = len(team_list)
    num_rounds = num_teams - 1
    half_size = num_teams // 2
    total_gameweeks = num_rounds * (2 if is_double_round_robin else 1)

    # Pre-calculate match dates for each gameweek with Cup day gaps
    gameweek_date_map = {}
    for gw_idx in range(1, total_gameweeks + 1):
        if reserve_cup_days and interval_gameweeks and interval_gameweeks > 0 and days_between_rounds == 1:
            # Calculate how many 1-day cup gaps occurred before this gameweek
            cup_gaps = (gw_idx - 1) // int(interval_gameweeks)
            day_offset = (gw_idx - 1) + cup_gaps
        else:
            day_offset = (gw_idx - 1) * days_between_rounds
        gameweek_date_map[gw_idx] = start_date + timedelta(days=day_offset)

    current_tz = timezone.get_current_timezone()
    matches_to_create = []

    halves = [1, 2] if is_double_round_robin else [1]

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

        rotation_list = list(team_list)

        for half in halves:
            for round_num in range(num_rounds):
                week_number = (half - 1) * num_rounds + round_num + 1
                match_day = gameweek_date_map.get(week_number, start_date + timedelta(days=(week_number - 1)))
                round_name = f"هفته {week_number}"

                round_matches = []
                for i in range(half_size):
                    team1 = rotation_list[i]
                    team2 = rotation_list[num_teams - 1 - i]

                    if team1 is None or team2 is None:
                        continue

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

                # Shuffle match order within this round so teams are scattered across time slots
                random.shuffle(round_matches)

                # Assign sequential time slots to matches in this round
                for slot_idx, (h_team, a_team) in enumerate(round_matches):
                    slot_hour, slot_min = time_slots[slot_idx % len(time_slots)]
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

                rotation_list.insert(1, rotation_list.pop())

        Match.objects.bulk_create(matches_to_create)

        # Auto-resync active Cup tournament matches with newly created league schedule
        active_cup = (
            Tournament.objects.filter(tournament_type='CUP', is_active=True, matches__isnull=False)
            .distinct()
            .order_by('-id')
            .first()
        )
        if active_cup:
            try:
                interleave_cup_with_league(
                    league_tournament=tournament,
                    cup_tournament=active_cup,
                    interval_gameweeks=interval_gameweeks,
                    time_slots=time_slots
                )
            except Exception:
                pass

    return len(matches_to_create)


def interleave_cup_with_league(league_tournament, cup_tournament, interval_gameweeks=6, start_offset_days=1, time_slots=None):
    """
    Intelligently synchronizes and interleaves Cup tournament rounds with the League schedule.
    Places each Cup stage onto the dedicated 1-day gap following every N league gameweeks
    (e.g. Day after GW 6, Day after GW 12, Day after GW 18, Day after GW 30 for Final).
    """
    league_matches = (
        Match.objects.filter(tournament=league_tournament)
        .order_by('date', 'id')
    )
    cup_matches = (
        Match.objects.filter(tournament=cup_tournament, is_knockout=True)
        .order_by('id')
    )

    if not league_matches.exists() or not cup_matches.exists():
        return {'success': False, 'error': 'هر دو تورنمنت لیگ و جام حذفی باید دارای مسابقه باشند.'}

    # Group cup matches by round
    cup_rounds_ordered = ["یک‌شانزدهم نهایی", "یک‌هشتم نهایی", "یک‌چهارم نهایی", "نیمه‌نهایی", "فینال"]
    cup_rounds = {}
    for cm in cup_matches:
        r_name = cm.round_name or "حذفی"
        if r_name not in cup_rounds:
            cup_rounds[r_name] = []
        cup_rounds[r_name].append(cm)

    # Filter rounds present in cup in logical order
    present_cup_rounds = [rk for rk in cup_rounds_ordered if rk in cup_rounds]
    for rk in cup_rounds.keys():
        if rk not in present_cup_rounds:
            present_cup_rounds.append(rk)

    # Map each league gameweek number to its date
    gameweek_dates_by_num = {}
    for lm in league_matches:
        digits = ''.join(filter(str.isdigit, lm.round_name or ''))
        if digits:
            gw_num = int(digits)
            if gw_num not in gameweek_dates_by_num and lm.date:
                gameweek_dates_by_num[gw_num] = lm.date.date()

    first_league_date = min(lm.date for lm in league_matches if lm.date).date() if league_matches.exists() else datetime.date.today()
    max_gw_num = max(gameweek_dates_by_num.keys()) if gameweek_dates_by_num else 30

    current_tz = timezone.get_current_timezone()
    updated_cup_matches_count = 0
    effective_slots = time_slots if time_slots else DAILY_TIME_SLOTS
    step = int(interval_gameweeks) if interval_gameweeks and int(interval_gameweeks) > 0 else 6

    with transaction.atomic():
        for idx, cup_round_name in enumerate(present_cup_rounds):
            target_gw = (idx + 1) * step
            # If this target gameweek exists, place cup on the next day
            if target_gw in gameweek_dates_by_num:
                cup_round_date = gameweek_dates_by_num[target_gw] + timedelta(days=1)
            elif idx == len(present_cup_rounds) - 1:
                # Final: day after the last gameweek of the league
                cup_round_date = gameweek_dates_by_num.get(max_gw_num, first_league_date) + timedelta(days=1)
            else:
                # Fallback: spaced by (idx + 1) * 7 days
                cup_round_date = first_league_date + timedelta(days=(idx + 1) * (step + 1))

            round_matches = cup_rounds[cup_round_name]
            for slot_idx, match in enumerate(round_matches):
                slot_hour, slot_min = effective_slots[slot_idx % len(effective_slots)]
                naive_dt = datetime.datetime.combine(cup_round_date, datetime.time(slot_hour, slot_min))
                slot_dt = timezone.make_aware(naive_dt, current_tz) if timezone.is_naive(naive_dt) else naive_dt

                match.date = slot_dt
                match.save(update_fields=['date'])
                updated_cup_matches_count += 1

    return {
        'success': True,
        'synced_rounds_count': len(present_cup_rounds),
        'updated_matches_count': updated_cup_matches_count,
        'interval_gameweeks': step
    }


def ensure_league_and_fixtures(tournament_name="مستر لیگ مجازی", start_date=None, clear_existing=True):
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
