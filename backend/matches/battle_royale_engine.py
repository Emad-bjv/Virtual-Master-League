"""
Battle Royale Engine — Virtual Master League
=============================================
Handles double-elimination (Winners Bracket + Losers Bracket + Grand Final with Bracket Reset)
tournament generation, bracket structure, rematch prevention, scheduling, and progression.
Supports dynamic team counts (8, 16, 32).
"""

import datetime
import math
import random
from django.db import transaction
from django.utils import timezone
from .models import Tournament, Match
from teams.models import Team


def get_persian_round_names(team_count: int) -> dict:
    """
    Returns Persian names for Winners, Losers, and Grand Final rounds
    based on the number of participating teams.
    """
    k = int(math.log2(team_count))
    wb_names = {}
    for r in range(1, k + 1):
        if r == k:
            wb_names[r] = "فینال برنده‌ها"
        elif r == k - 1:
            wb_names[r] = "نیمه‌نهایی برنده‌ها"
        elif r == k - 2 and team_count >= 16:
            wb_names[r] = "یک‌چهارم نهایی برنده‌ها"
        elif r == 1:
            wb_names[r] = "دور اول برنده‌ها"
        else:
            wb_names[r] = f"دور {r} برنده‌ها"

    num_lb_rounds = 2 * (k - 1)
    lb_names = {}
    for r in range(1, num_lb_rounds + 1):
        if r == num_lb_rounds:
            lb_names[r] = "فینال بازنده‌ها"
        elif r == num_lb_rounds - 1:
            lb_names[r] = "نیمه‌نهایی بازنده‌ها"
        elif r == 1:
            lb_names[r] = "دور اول بازنده‌ها"
        elif r == 2:
            lb_names[r] = "دور دوم بازنده‌ها"
        elif r == 3:
            lb_names[r] = "دور سوم بازنده‌ها"
        elif r == 4:
            lb_names[r] = "دور چهارم بازنده‌ها"
        else:
            lb_names[r] = f"دور {r} بازنده‌ها"

    return {
        'wb': wb_names,
        'lb': lb_names,
        'gf': "فینال بزرگ",
        'gf_reset': "فینال بزرگ (ریست)",
    }


def calculate_tournament_schedule(team_count: int, start_date: datetime.date) -> dict:
    """
    Calculates calendar dates for every round in Battle Royale.
    Match days: Sunday (6), Tuesday (1), Thursday (3), Friday (4).
    Rest days: Saturday (5), Monday (0), Wednesday (2).
    Max 4 matches per day.
    """
    # Allowed match weekdays in Python datetime (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun)
    MATCH_WEEKDAYS = [6, 1, 3, 4]  # Sun, Tue, Thu, Fri

    def next_match_day(curr_date: datetime.date) -> datetime.date:
        d = curr_date
        while d.weekday() not in MATCH_WEEKDAYS:
            d += datetime.timedelta(days=1)
        return d

    def advance_to_subsequent_match_day(curr_date: datetime.date) -> datetime.date:
        d = curr_date + datetime.timedelta(days=1)
        while d.weekday() not in MATCH_WEEKDAYS:
            d += datetime.timedelta(days=1)
        return d

    # Start on or after start_date at a valid match day
    d = next_match_day(start_date)
    k = int(math.log2(team_count))
    schedule_plan = {}

    if team_count == 16:
        # Optimized 16-team schedule per spec:
        # Day 1: WB-R1 First Half (4 matches)
        # Day 2: Rest
        # Day 3: WB-R1 Second Half (4 matches)
        # Day 4: WB-R2 (4 matches)
        # Day 5: Rest
        # Day 6: LB-R1 (4 matches)
        # Day 7: Rest
        # Day 8: LB-R2 (4 matches)
        # Day 9: Rest
        # Day 10: WB-Semi (2) + LB-R3 (2) = 4 matches
        # Day 11: LB-R4 (2 matches)
        # Day 12: Rest
        # Day 13: WB-Final (1) + LB-Semi (1) = 2 matches
        # Day 14: Rest
        # Day 15: LB-Final (1 match)
        # Day 16: Rest
        # Day 17: Grand Final (+ Reset if needed)
        
        day_cursor = d
        schedule_plan['WB_1_part1'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['WB_1_part2'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['WB_2'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['LB_1'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['LB_2'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['WB_3'] = day_cursor
        schedule_plan['LB_3'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['LB_4'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['WB_4'] = day_cursor
        schedule_plan['LB_5'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['LB_6'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['GF'] = day_cursor
        schedule_plan['GF_RESET'] = day_cursor

    elif team_count == 8:
        # 8-team schedule:
        # Day 1: WB-R1 (4 matches)
        # Day 2: LB-R1 (2 matches)
        # Day 3: WB-Semi (2 matches)
        # Day 4: LB-R2 (2 matches)
        # Day 5: WB-Final (1 match) + LB-Semi (1 match)
        # Day 6: LB-Final (1 match)
        # Day 7: Grand Final
        day_cursor = d
        schedule_plan['WB_1'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['LB_1'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['WB_2'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['LB_2'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['WB_3'] = day_cursor
        schedule_plan['LB_3'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['LB_4'] = day_cursor
        day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['GF'] = day_cursor
        schedule_plan['GF_RESET'] = day_cursor

    else:
        # 32 teams or generalized power-of-2 schedule
        day_cursor = d
        for r in range(1, k + 1):
            schedule_plan[f'WB_{r}'] = day_cursor
            day_cursor = advance_to_subsequent_match_day(day_cursor)
        num_lb_rounds = 2 * (k - 1)
        for r in range(1, num_lb_rounds + 1):
            schedule_plan[f'LB_{r}'] = day_cursor
            day_cursor = advance_to_subsequent_match_day(day_cursor)
        schedule_plan['GF'] = day_cursor
        schedule_plan['GF_RESET'] = day_cursor

    return schedule_plan


@transaction.atomic
def generate_battle_royale_bracket(
    tournament: Tournament,
    teams: list[Team],
    start_date=None,
    time_slots=None,
    clear_existing=True,
    shuffle_draw=True
) -> dict:
    """
    Generates a full double-elimination bracket for the given teams (power of 2: 8, 16, 32).
    Pre-creates all Matches for Winners Bracket, Losers Bracket, and Grand Final (with dormant reset).
    Wires up next_match and loser_next_match FKs so the tournament can progress automatically.
    """
    num_teams = len(teams)
    if num_teams < 4 or not math.log2(num_teams).is_integer():
        return {
            'success': False,
            'error': 'تعداد تیم‌ها باید توانی از ۲ باشد (مثلاً ۸، ۱۶ یا ۳۲ تیم).'
        }

    if clear_existing:
        Match.objects.filter(tournament=tournament).delete()

    if start_date is None:
        start_date = datetime.date.today() + datetime.timedelta(days=1)
    elif isinstance(start_date, datetime.datetime):
        start_date = start_date.date()

    if not time_slots:
        time_slots = [(18, 0), (19, 15), (20, 30), (21, 45)]

    current_tz = timezone.get_current_timezone()
    k = int(math.log2(num_teams))
    names = get_persian_round_names(num_teams)
    schedule_dates = calculate_tournament_schedule(num_teams, start_date)

    shuffled_teams = list(teams)
    if shuffle_draw:
        random.shuffle(shuffled_teams)

    # -------------------------------------------------------------
    # 1. Create Grand Final Matches (Match 1 + Dormant Match 2 Reset)
    # -------------------------------------------------------------
    gf_date = schedule_dates.get('GF', start_date)
    gf_time = datetime.time(20, 30)
    naive_dt = datetime.datetime.combine(gf_date, gf_time)
    gf_dt = timezone.make_aware(naive_dt, current_tz) if timezone.is_naive(naive_dt) else naive_dt

    gf_reset_date = schedule_dates.get('GF_RESET', gf_date)
    gf_reset_time = datetime.time(22, 0)
    naive_dt_reset = datetime.datetime.combine(gf_reset_date, gf_reset_time)
    gf_reset_dt = timezone.make_aware(naive_dt_reset, current_tz) if timezone.is_naive(naive_dt_reset) else naive_dt_reset

    gf_match_1 = Match.objects.create(
        tournament=tournament,
        round_name=names['gf'],
        bracket_side='GRAND_FINAL',
        bracket_round=1,
        is_knockout=True,
        has_extra_time=True,
        status='SCHEDULED',
        half_status='NOT_STARTED',
        date=gf_dt,
        importance_multiplier=2.5,
    )

    gf_match_reset = Match.objects.create(
        tournament=tournament,
        round_name=names['gf_reset'],
        bracket_side='GRAND_FINAL',
        bracket_round=2,
        is_knockout=True,
        has_extra_time=True,
        is_reset_match=True,
        status='SCHEDULED',
        half_status='NOT_STARTED',
        date=gf_reset_dt,
        importance_multiplier=3.0,
    )

    # -------------------------------------------------------------
    # 2. Create Winners Bracket (WB) Matches
    # -------------------------------------------------------------
    # wb_matches[round_num] = list of Match instances
    wb_matches = {}
    for r in range(1, k + 1):
        matches_count = num_teams // (2 ** r)
        r_name = names['wb'][r]
        has_et = (r >= k - 1)  # Extra time for WB Semi & Final
        wb_matches[r] = []

        # Determine date for this round
        if num_teams == 16 and r == 1:
            r_date_part1 = schedule_dates.get('WB_1_part1', start_date)
            r_date_part2 = schedule_dates.get('WB_1_part2', start_date)
        else:
            r_date_part1 = schedule_dates.get(f'WB_{r}', start_date)
            r_date_part2 = r_date_part1

        for m_idx in range(matches_count):
            if num_teams == 16 and r == 1:
                match_date = r_date_part1 if m_idx < 4 else r_date_part2
                slot_h, slot_m = time_slots[m_idx % 4]
            else:
                match_date = r_date_part1
                slot_h, slot_m = time_slots[m_idx % len(time_slots)]

            naive_m_dt = datetime.datetime.combine(match_date, datetime.time(slot_h, slot_m))
            aware_dt = timezone.make_aware(naive_m_dt, current_tz) if timezone.is_naive(naive_m_dt) else naive_m_dt

            m = Match.objects.create(
                tournament=tournament,
                round_name=r_name,
                bracket_side='WINNERS',
                bracket_round=r,
                is_knockout=True,
                has_extra_time=has_et,
                status='SCHEDULED',
                half_status='NOT_STARTED',
                date=aware_dt,
                importance_multiplier=1.2 + (r * 0.2),
            )
            wb_matches[r].append(m)

    # Populate WB Round 1 with teams
    for i, m in enumerate(wb_matches[1]):
        m.home_team = shuffled_teams[2 * i]
        m.away_team = shuffled_teams[2 * i + 1]
        m.save(update_fields=['home_team', 'away_team'])

    # Link WB matches forward (next_match)
    for r in range(1, k):
        curr_round = wb_matches[r]
        next_round = wb_matches[r + 1]
        for i, target_match in enumerate(next_round):
            feed_1 = curr_round[2 * i]
            feed_2 = curr_round[2 * i + 1]
            feed_1.next_match = target_match
            feed_1.save(update_fields=['next_match'])
            feed_2.next_match = target_match
            feed_2.save(update_fields=['next_match'])

    # WB Final feeds into Grand Final Match 1 (Home Team)
    wb_final_match = wb_matches[k][0]
    wb_final_match.next_match = gf_match_1
    wb_final_match.save(update_fields=['next_match'])

    # -------------------------------------------------------------
    # 3. Create Losers Bracket (LB) Matches
    # -------------------------------------------------------------
    num_lb_rounds = 2 * (k - 1)
    lb_matches = {}

    for r in range(1, num_lb_rounds + 1):
        # Round index j from 1 to k-1
        j = (r + 1) // 2
        matches_count = num_teams // (2 ** (j + 1))
        r_name = names['lb'][r]
        has_et = (r >= 3)  # Extra time for LB Round 3 and later
        r_date = schedule_dates.get(f'LB_{r}', start_date)
        lb_matches[r] = []

        for m_idx in range(matches_count):
            slot_h, slot_m = time_slots[m_idx % len(time_slots)]
            naive_m_dt = datetime.datetime.combine(r_date, datetime.time(slot_h, slot_m))
            aware_dt = timezone.make_aware(naive_m_dt, current_tz) if timezone.is_naive(naive_m_dt) else naive_m_dt

            m = Match.objects.create(
                tournament=tournament,
                round_name=r_name,
                bracket_side='LOSERS',
                bracket_round=r,
                is_knockout=True,
                has_extra_time=has_et,
                status='SCHEDULED',
                half_status='NOT_STARTED',
                date=aware_dt,
                importance_multiplier=1.1 + (r * 0.15),
            )
            lb_matches[r].append(m)

    # -------------------------------------------------------------
    # 4. Link Losers Bracket Internals (next_match within LB)
    # -------------------------------------------------------------
    for r in range(1, num_lb_rounds):
        curr_round = lb_matches[r]
        next_round = lb_matches[r + 1]

        if r % 2 == 1:
            # Minor round (odd) to Major round (even):
            # Same number of matches: LB[r][i] -> LB[r+1][i] (feeds home_team)
            for i, curr_m in enumerate(curr_round):
                curr_m.next_match = next_round[i]
                curr_m.save(update_fields=['next_match'])
        else:
            # Major round (even) to Minor round (odd):
            # Halving matches: LB[r][2i] and LB[r][2i+1] -> LB[r+1][i]
            for i, target_m in enumerate(next_round):
                feed_1 = curr_round[2 * i]
                feed_2 = curr_round[2 * i + 1]
                feed_1.next_match = target_m
                feed_1.save(update_fields=['next_match'])
                feed_2.next_match = target_m
                feed_2.save(update_fields=['next_match'])

    # LB Final winner feeds into Grand Final Match 1 (Away Team)
    lb_final_match = lb_matches[num_lb_rounds][0]
    lb_final_match.next_match = gf_match_1
    lb_final_match.save(update_fields=['next_match'])

    # -------------------------------------------------------------
    # 5. Link WB Losers dropping down into LB (loser_next_match)
    # -------------------------------------------------------------
    # WB-R1 losers feed into LB-R1:
    # 2 losers per LB-R1 match: WB-R1[2i] (loser home) & WB-R1[2i+1] (loser away)
    for i, lb_target in enumerate(lb_matches[1]):
        wb_feed_1 = wb_matches[1][2 * i]
        wb_feed_2 = wb_matches[1][2 * i + 1]
        wb_feed_1.loser_next_match = lb_target
        wb_feed_1.save(update_fields=['loser_next_match'])
        wb_feed_2.loser_next_match = lb_target
        wb_feed_2.save(update_fields=['loser_next_match'])

    # WB rounds r >= 2 losers feed into LB major round 2*(r - 1):
    # To prevent rematches, invert the drop-down match indices!
    for r in range(2, k + 1):
        target_lb_round_num = 2 * (r - 1)
        target_lb_round = lb_matches[target_lb_round_num]
        num_targets = len(target_lb_round)
        wb_source_round = wb_matches[r]

        for i, wb_m in enumerate(wb_source_round):
            # Inverted cross-match drop to avoid meeting previous opponents
            inverted_target_idx = num_targets - 1 - i
            target_lb_match = target_lb_round[inverted_target_idx]
            wb_m.loser_next_match = target_lb_match
            wb_m.save(update_fields=['loser_next_match'])

    total_matches_count = (
        sum(len(m_list) for m_list in wb_matches.values()) +
        sum(len(m_list) for m_list in lb_matches.values()) +
        2  # GF + GF_RESET
    )

    return {
        'success': True,
        'tournament_id': tournament.id,
        'tournament_name': tournament.name,
        'team_count': num_teams,
        'matches_created': total_matches_count,
        'wb_rounds_count': k,
        'lb_rounds_count': num_lb_rounds,
        'grand_final_id': gf_match_1.id,
        'grand_final_reset_id': gf_match_reset.id,
    }


def advance_battle_royale_winner(match: Match) -> dict:
    """
    Advances winner and loser of a Battle Royale knockout match.
    - If match in WB: winner goes to next_match, loser drops to loser_next_match.
    - If match in LB: winner goes to next_match, loser is eliminated.
    - If match is Grand Final (1):
        - If WB winner wins: WB winner is champion! Reset match dormant.
        - If LB winner wins: Bracket Reset triggered! Activates reset match.
    - If match is Grand Final (Reset): winner is champion!
    """
    if match.tournament.tournament_type != 'BATTLE_ROYALE':
        return {'success': False, 'error': 'این مسابقه مربوط به تورنمنت نبرد رویال نیست.'}

    if match.status != 'FINISHED':
        return {'success': False, 'error': 'مسابقه هنوز پایان نیافته است.'}

    # 1. Determine Winner and Loser
    winner = None
    loser = None

    if match.home_score > match.away_score:
        winner = match.home_team
        loser = match.away_team
    elif match.away_score > match.home_score:
        winner = match.away_team
        loser = match.home_team
    else:
        # Tie - check penalties
        if match.home_penalties is not None and match.away_penalties is not None:
            if match.home_penalties > match.away_penalties:
                winner = match.home_team
                loser = match.away_team
            elif match.away_penalties > match.home_penalties:
                winner = match.away_team
                loser = match.home_team
            else:
                return {'success': False, 'error': 'ضربات پنالتی نمی‌تواند مساوی باشد.'}
        else:
            return {'success': False, 'error': 'بازی مساوی شده است اما پنالتی‌ها ثبت نشده‌اند.'}

    if not winner:
        return {'success': False, 'error': 'برنده مشخص نشد.'}

    result = {
        'success': True,
        'match_id': match.id,
        'winner': winner.name,
        'loser': loser.name if loser else None,
        'bracket_side': match.bracket_side,
        'is_champion': False,
        'bracket_reset_triggered': False,
    }

    with transaction.atomic():
        # -------------------------------------------------------------
        # Case A: Grand Final
        # -------------------------------------------------------------
        if match.bracket_side == 'GRAND_FINAL':
            if match.is_reset_match:
                # Decisive reset match finished!
                result['is_champion'] = True
                result['champion_name'] = winner.name
                result['message'] = f'قهرمان نهایی نبرد رویال مشخص شد: {winner.name} 🏆'
                return result

            # Match 1 of Grand Final
            # In GF Match 1: home_team is WB Champion (undefeated), away_team is LB Champion
            if winner.id == match.home_team_id:
                # WB Winner won without dropping a match!
                result['is_champion'] = True
                result['champion_name'] = winner.name
                result['message'] = f'تیم {winner.name} بدون باخت قهرمان نبرد رویال شد! 🏆'
                # Ensure reset match is cancelled/dormant
                reset_match = Match.objects.filter(
                    tournament=match.tournament,
                    bracket_side='GRAND_FINAL',
                    is_reset_match=True
                ).first()
                if reset_match:
                    reset_match.status = 'FINISHED'
                    reset_match.round_name = 'فینال بزرگ (بدون نیاز به ریست)'
                    reset_match.save(update_fields=['status', 'round_name'])
                return result
            else:
                # LB Winner won! Trigger Bracket Reset!
                result['bracket_reset_triggered'] = True
                result['message'] = (
                    f'تیم {winner.name} فینال اول را برد! طبق قانون ریست براکت، '
                    f'بازی دوم و سرنوشت‌ساز فینال بزرگ فعال شد! 🔥'
                )
                reset_match = Match.objects.filter(
                    tournament=match.tournament,
                    bracket_side='GRAND_FINAL',
                    is_reset_match=True
                ).first()
                if reset_match:
                    reset_match.home_team = match.home_team
                    reset_match.away_team = match.away_team
                    reset_match.status = 'SCHEDULED'
                    reset_match.half_status = 'NOT_STARTED'
                    reset_match.save(update_fields=['home_team', 'away_team', 'status', 'half_status'])
                    result['reset_match_id'] = reset_match.id
                return result

        # -------------------------------------------------------------
        # Case B: Winners Bracket (WB)
        # -------------------------------------------------------------
        if match.bracket_side == 'WINNERS':
            # 1. Advance Winner to next_match
            if match.next_match:
                next_m = match.next_match
                if next_m.bracket_side == 'GRAND_FINAL':
                    # WB Final winner is always home_team of Grand Final
                    next_m.home_team = winner
                    next_m.save(update_fields=['home_team'])
                else:
                    # Sibling feeders check
                    siblings = list(Match.objects.filter(next_match=next_m).order_by('id'))
                    if siblings and siblings[0].id == match.id:
                        next_m.home_team = winner
                        next_m.save(update_fields=['home_team'])
                    else:
                        next_m.away_team = winner
                        next_m.save(update_fields=['away_team'])
                result['winner_advanced_to'] = next_m.id

            # 2. Drop Loser to loser_next_match in Losers Bracket
            if match.loser_next_match and loser:
                target_lb = match.loser_next_match

                # In LB-R1: two WB-R1 matches feed into one LB-R1 match
                if target_lb.bracket_round == 1:
                    siblings = list(Match.objects.filter(loser_next_match=target_lb).order_by('id'))
                    if siblings and siblings[0].id == match.id:
                        target_lb.home_team = loser
                        target_lb.save(update_fields=['home_team'])
                    else:
                        target_lb.away_team = loser
                        target_lb.save(update_fields=['away_team'])
                else:
                    # In higher LB rounds: LB winner takes home_team, WB loser drops into away_team
                    target_lb.away_team = loser
                    target_lb.save(update_fields=['away_team'])

                result['loser_dropped_to'] = target_lb.id

            return result

        # -------------------------------------------------------------
        # Case C: Losers Bracket (LB)
        # -------------------------------------------------------------
        if match.bracket_side == 'LOSERS':
            # Loser is eliminated from the tournament!
            result['eliminated_team'] = loser.name if loser else None

            # Advance Winner to next_match
            if match.next_match:
                next_m = match.next_match
                if next_m.bracket_side == 'GRAND_FINAL':
                    # LB Final winner is always away_team of Grand Final
                    next_m.away_team = winner
                    next_m.save(update_fields=['away_team'])
                elif next_m.bracket_round % 2 == 0:
                    # Next round is major round: LB winner takes home_team slot
                    next_m.home_team = winner
                    next_m.save(update_fields=['home_team'])
                else:
                    # Next round is minor round: check siblings
                    siblings = list(Match.objects.filter(next_match=next_m).order_by('id'))
                    if siblings and siblings[0].id == match.id:
                        next_m.home_team = winner
                        next_m.save(update_fields=['home_team'])
                    else:
                        next_m.away_team = winner
                        next_m.save(update_fields=['away_team'])

                result['winner_advanced_to'] = next_m.id

            return result

    return result


def serialize_battle_royale_bracket(tournament: Tournament) -> dict:
    """
    Serializes full Battle Royale bracket grouped into Winners Bracket rounds,
    Losers Bracket rounds, Grand Final, and current standings/champion.
    """
    matches = (
        Match.objects.filter(tournament=tournament)
        .select_related('home_team', 'away_team', 'next_match', 'loser_next_match')
        .order_by('bracket_side', 'bracket_round', 'id')
    )

    def serialize_match_node(m: Match):
        return {
            'id': m.id,
            'round_name': m.round_name,
            'bracket_side': m.bracket_side,
            'bracket_round': m.bracket_round,
            'is_knockout': m.is_knockout,
            'has_extra_time': m.has_extra_time,
            'is_reset_match': m.is_reset_match,
            'home_team_id': m.home_team_id,
            'home_team_name': m.home_team.name if m.home_team else 'مشخص نشده (TBD)',
            'home_team_logo': m.home_team.logo if m.home_team else '',
            'away_team_id': m.away_team_id,
            'away_team_name': m.away_team.name if m.away_team else 'مشخص نشده (TBD)',
            'away_team_logo': m.away_team.logo if m.away_team else '',
            'home_score': m.home_score,
            'away_score': m.away_score,
            'home_penalties': m.home_penalties,
            'away_penalties': m.away_penalties,
            'status': m.status,
            'half_status': m.half_status,
            'date': m.date.isoformat() if m.date else None,
            'next_match_id': m.next_match_id,
            'loser_next_match_id': m.loser_next_match_id,
            'importance_multiplier': m.importance_multiplier,
        }

    wb_rounds_dict = {}
    lb_rounds_dict = {}
    gf_matches = []

    for m in matches:
        serialized = serialize_match_node(m)
        if m.bracket_side == 'WINNERS':
            r_num = m.bracket_round or 1
            if r_num not in wb_rounds_dict:
                wb_rounds_dict[r_num] = {'round_number': r_num, 'round_name': m.round_name, 'matches': []}
            wb_rounds_dict[r_num]['matches'].append(serialized)

        elif m.bracket_side == 'LOSERS':
            r_num = m.bracket_round or 1
            if r_num not in lb_rounds_dict:
                lb_rounds_dict[r_num] = {'round_number': r_num, 'round_name': m.round_name, 'matches': []}
            lb_rounds_dict[r_num]['matches'].append(serialized)

        elif m.bracket_side == 'GRAND_FINAL':
            gf_matches.append(serialized)

    sorted_wb = [wb_rounds_dict[k] for k in sorted(wb_rounds_dict.keys())]
    sorted_lb = [lb_rounds_dict[k] for k in sorted(lb_rounds_dict.keys())]

    # Detect champion if Grand Final is finished
    champion = None
    if gf_matches:
        # Check if reset match finished
        reset_m = next((m for m in gf_matches if m['is_reset_match']), None)
        main_gf = next((m for m in gf_matches if not m['is_reset_match']), None)

        if reset_m and reset_m['status'] == 'FINISHED' and reset_m['round_name'] != 'فینال بزرگ (بدون نیاز به ریست)':
            if reset_m['home_score'] > reset_m['away_score'] or (reset_m['home_penalties'] or 0) > (reset_m['away_penalties'] or 0):
                champion = {'id': reset_m['home_team_id'], 'name': reset_m['home_team_name'], 'logo': reset_m['home_team_logo']}
            else:
                champion = {'id': reset_m['away_team_id'], 'name': reset_m['away_team_name'], 'logo': reset_m['away_team_logo']}
        elif main_gf and main_gf['status'] == 'FINISHED':
            # If home won (WB Champion)
            if main_gf['home_score'] > main_gf['away_score'] or (main_gf['home_penalties'] or 0) > (main_gf['away_penalties'] or 0):
                champion = {'id': main_gf['home_team_id'], 'name': main_gf['home_team_name'], 'logo': main_gf['home_team_logo']}

    total_m = len(matches)
    finished_m = sum(1 for m in matches if m.status == 'FINISHED')

    return {
        'tournament': {
            'id': tournament.id,
            'name': tournament.name,
            'tournament_type': tournament.tournament_type,
            'is_active': tournament.is_active,
            'created_at': tournament.created_at.isoformat() if tournament.created_at else None,
        },
        'winners_bracket': sorted_wb,
        'losers_bracket': sorted_lb,
        'grand_final': gf_matches,
        'champion': champion,
        'stats': {
            'total_matches': total_m,
            'finished_matches': finished_m,
            'remaining_matches': total_m - finished_m,
        }
    }
