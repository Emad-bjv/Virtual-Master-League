"""
matches/tasks.py

Celery tasks for post-match processing:
- Disciplinary actions (yellow/red card -> suspension)
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='matches.process_disciplinary_actions')
def task_process_disciplinary_actions(match_id: int):
    """
    Processes disciplinary actions (yellow and red cards) after a match ends.

    Rules:
    - 3 accumulated yellow cards = 1 match suspension (accumulator resets to 0)
    - Direct red card = 2 match suspension

    NOTE: Suspension reduction (decrement) is NOT done here.
    It should be done manually or via a weekly task that decrements only players
    who missed a game due to suspension (not injury or coach choice).
    """
    from teams.models import Player
    from matches.models import Match, MatchEvent

    try:
        match = Match.objects.get(id=match_id)
    except Match.DoesNotExist:
        logger.error(f"[Disciplinary] Match {match_id} not found.")
        return {'error': f'Match {match_id} not found.'}

    if match.status != 'FINISHED':
        logger.warning(f"[Disciplinary] Match {match_id} is not FINISHED (status={match.status}). Skipping.")
        return {'error': f'Match {match_id} is not finished yet'}

    yellow_events = MatchEvent.objects.filter(match=match, event_type='YELLOW', is_undone=False).select_related('player', 'team')
    red_events = MatchEvent.objects.filter(match=match, event_type__in=['RED', 'SECOND_YELLOW'], is_undone=False).select_related('player', 'team')

    from teams.lineup_services import auto_replace_ineligible_starters

    results = {
        'match_id': match_id,
        'yellow_processed': [],
        'red_processed': [],
        'suspensions_triggered': [],
        'teams_auto_aligned': [],
    }

    affected_teams = set()

    for event in yellow_events:
        player = event.player
        if not player:
            continue
        player.yellow_card_accumulator += 1

        triggered_suspension = False
        if player.yellow_card_accumulator >= 3:
            # 3 accumulated yellows triggers 1-match suspension
            player.suspension_matches += 1
            player.yellow_card_accumulator = 0
            triggered_suspension = True
            if player.team:
                affected_teams.add(player.team)
            logger.info(
                f"[Disciplinary] Player {player.name} (#{player.id}) hit 3 yellow card accumulator. "
                f"Suspension: +1 match (total: {player.suspension_matches})"
            )
            results['suspensions_triggered'].append({
                'player_id': player.id,
                'player_name': player.name,
                'reason': '3 yellow cards accumulated',
                'suspension_matches': player.suspension_matches,
            })

        player.save(update_fields=['yellow_card_accumulator', 'suspension_matches'])
        results['yellow_processed'].append({
            'player_id': player.id,
            'player_name': player.name,
            'accumulator': player.yellow_card_accumulator,
            'triggered_suspension': triggered_suspension,
        })

    for event in red_events:
        player = event.player
        if not player:
            continue
        suspension_add = 1 if event.event_type == 'SECOND_YELLOW' else 2
        player.suspension_matches += suspension_add
        player.save(update_fields=['suspension_matches'])
        if player.team:
            affected_teams.add(player.team)

        logger.info(
            f"[Disciplinary] Player {player.name} (#{player.id}) received {event.event_type}. "
            f"Suspension: +{suspension_add} matches (total: {player.suspension_matches})"
        )
        results['red_processed'].append({
            'player_id': player.id,
            'player_name': player.name,
            'event_type': event.event_type,
            'suspension_added': suspension_add,
            'total_suspension': player.suspension_matches,
        })
        results['suspensions_triggered'].append({
            'player_id': player.id,
            'player_name': player.name,
            'reason': 'second yellow card' if event.event_type == 'SECOND_YELLOW' else 'direct red card',
            'suspension_matches': player.suspension_matches,
        })

    # Automatically replace suspended starters in next match lineup for affected teams
    for team in affected_teams:
        try:
            reps = auto_replace_ineligible_starters(team)
            results['teams_auto_aligned'].append({
                'team_id': team.id,
                'team_name': team.name,
                'replacements_count': len(reps),
            })
        except Exception as e:
            logger.error(f"[Disciplinary] Failed to auto-replace starters for team {team.name}: {e}")

    logger.info(
        f"[Disciplinary] Match {match_id}: processed {len(yellow_events)} yellows, "
        f"{len(red_events)} reds, {len(results['suspensions_triggered'])} suspensions triggered."
    )

    return results


@shared_task(name='matches.decrement_suspension_for_suspended_players')
def task_decrement_suspended_players(match_id: int):
    """
    Decrement suspension counter for players who were SUSPENDED (not injured or benched by coach choice)
    and therefore missed this match.

    Called after each match completes. Checks players from BOTH teams who had suspension_matches > 0
    and were NOT in the starting lineup or bench (i.e. absent due to suspension).

    NOTE: A suspended player who was somehow submitted in the lineup would NOT have their
    suspension decremented here (the serializer validation prevents that from happening).
    """
    from teams.models import Player
    from matches.models import Match

    try:
        match = Match.objects.select_related('home_team', 'away_team').get(id=match_id)
    except Match.DoesNotExist:
        logger.error(f"[Suspension Decrement] Match {match_id} not found.")
        return {'error': f'Match {match_id} not found.'}

    if match.status != 'FINISHED':
        logger.warning(f"[Suspension Decrement] Match {match_id} not finished yet.")
        return {'error': f'Match {match_id} is not finished yet'}

    teams = []
    if match.home_team:
        teams.append(match.home_team)
    if match.away_team:
        teams.append(match.away_team)

    results = []

    for team in teams:
        suspended_players = team.players.filter(suspension_matches__gt=0)
        for player in suspended_players:
            player.suspension_matches = max(0, player.suspension_matches - 1)
            player.save(update_fields=['suspension_matches'])
            logger.info(
                f"[Suspension Decrement] Player {player.name} served 1 match suspension. "
                f"Remaining: {player.suspension_matches}"
            )
            results.append({
                'player_id': player.id,
                'player_name': player.name,
                'team': team.name,
                'suspension_remaining': player.suspension_matches,
            })

    return {
        'match_id': match_id,
        'players_decremented': results,
    }


@shared_task(name='matches.auto_record_match_stats')
def task_auto_record_match_stats(match_id: int):
    """
    Automatically creates/updates PlayerMatchStat entries for all participating players
    with minutes played and realistic match ratings based on scoreline, events, and performance.
    """
    from decimal import Decimal
    from matches.models import Match, MatchEvent, PlayerMatchStat
    from teams.models import Player

    try:
        match = Match.objects.select_related('home_team', 'away_team').get(id=match_id)
    except Match.DoesNotExist:
        logger.error(f"[Stats Record] Match {match_id} not found.")
        return {'error': f'Match {match_id} not found.'}

    if match.status != 'FINISHED':
        logger.warning(f"[Stats Record] Match {match_id} is not FINISHED.")
        return {'error': f'Match {match_id} is not finished.'}

    events = list(MatchEvent.objects.filter(match=match, is_undone=False))
    sub_out_events = {e.player_id: e.minute for e in events if e.event_type == 'SUB_OUT'}
    sub_in_events = {e.player_id: e.minute for e in events if e.event_type == 'SUB_IN'}
    goals_by_player = {}
    assists_by_player = {}
    yellow_by_player = {}
    red_by_player = {}

    for e in events:
        if e.event_type in ['GOAL', 'PENALTY_SCORED']:
            goals_by_player[e.player_id] = goals_by_player.get(e.player_id, 0) + 1
            if e.assist_player_id:
                assists_by_player[e.assist_player_id] = assists_by_player.get(e.assist_player_id, 0) + 1
        elif e.event_type == 'ASSIST':
            assists_by_player[e.player_id] = assists_by_player.get(e.player_id, 0) + 1
        elif e.event_type == 'YELLOW':
            yellow_by_player[e.player_id] = yellow_by_player.get(e.player_id, 0) + 1
        elif e.event_type in ['RED', 'SECOND_YELLOW']:
            red_by_player[e.player_id] = red_by_player.get(e.player_id, 0) + 1

    home_starters = list(match.home_team.players.filter(is_starting=True)) if match.home_team else []
    away_starters = list(match.away_team.players.filter(is_starting=True)) if match.away_team else []

    home_score = match.home_score or 0
    away_score = match.away_score or 0
    home_won = home_score > away_score
    away_won = away_score > home_score
    draw = (home_score == away_score)

    stats_created = []

    # Starters
    for p in home_starters + away_starters:
        is_home = (p.team_id == match.home_team_id)
        conceded = away_score if is_home else home_score
        team_won = home_won if is_home else away_won

        sub_out_min = sub_out_events.get(p.id)
        minutes = sub_out_min if sub_out_min is not None else 90

        # Existing stat check (keep custom rating if already set by admin)
        existing = PlayerMatchStat.objects.filter(match=match, player=p).first()
        if existing and existing.rating is not None:
            stats_created.append(existing)
            continue

        rating = 6.0
        if team_won: rating += 0.6
        elif draw: rating += 0.2
        else: rating -= 0.3

        rating += goals_by_player.get(p.id, 0) * 1.0
        rating += assists_by_player.get(p.id, 0) * 0.7

        if p.position in ['GK', 'CB', 'LB', 'RB', 'DMF'] and conceded == 0:
            rating += 0.8
        elif p.position in ['GK', 'CB'] and conceded >= 3:
            rating -= 0.6

        rating -= yellow_by_player.get(p.id, 0) * 0.4
        rating -= red_by_player.get(p.id, 0) * 1.5
        rating = max(4.0, min(10.0, round(rating, 1)))

        stat, _ = PlayerMatchStat.objects.update_or_create(
            match=match, player=p,
            defaults={
                'minutes_played': minutes,
                'rating': Decimal(str(rating)),
                'was_starter': True,
            }
        )
        stats_created.append(stat)

    # Sub-ins
    for p_id, sub_min in sub_in_events.items():
        if any(s.player_id == p_id for s in stats_created):
            continue
        try:
            p = Player.objects.get(id=p_id)
            minutes = max(1, 90 - sub_min)
            is_home = (p.team_id == match.home_team_id)
            team_won = home_won if is_home else away_won

            existing = PlayerMatchStat.objects.filter(match=match, player=p).first()
            if existing and existing.rating is not None:
                stats_created.append(existing)
                continue

            rating = 6.0
            if team_won: rating += 0.4
            rating += goals_by_player.get(p.id, 0) * 1.0
            rating += assists_by_player.get(p.id, 0) * 0.7
            rating -= yellow_by_player.get(p.id, 0) * 0.4
            rating -= red_by_player.get(p.id, 0) * 1.5
            rating = max(4.0, min(10.0, round(rating, 1)))

            stat, _ = PlayerMatchStat.objects.update_or_create(
                match=match, player=p,
                defaults={
                    'minutes_played': minutes,
                    'rating': Decimal(str(rating)),
                    'was_starter': False,
                }
            )
            stats_created.append(stat)
        except Player.DoesNotExist:
            continue

    logger.info(f"[Stats Record] Recorded/Updated {len(stats_created)} player stats for match #{match_id}")
    return {'match_id': match_id, 'recorded_count': len(stats_created)}

