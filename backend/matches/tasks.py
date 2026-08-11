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

    yellow_events = MatchEvent.objects.filter(match=match, event_type='YELLOW').select_related('player')
    red_events = MatchEvent.objects.filter(match=match, event_type='RED').select_related('player')

    results = {
        'match_id': match_id,
        'yellow_processed': [],
        'red_processed': [],
        'suspensions_triggered': [],
    }

    for event in yellow_events:
        player = event.player
        player.yellow_card_accumulator += 1

        triggered_suspension = False
        if player.yellow_card_accumulator >= 3:
            # 3 accumulated yellows triggers 1-match suspension
            player.suspension_matches += 1
            player.yellow_card_accumulator = 0
            triggered_suspension = True
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
        player.suspension_matches += 2  # Direct red = 2 match suspension
        player.save(update_fields=['suspension_matches'])

        logger.info(
            f"[Disciplinary] Player {player.name} (#{player.id}) received red card. "
            f"Suspension: +2 matches (total: {player.suspension_matches})"
        )
        results['red_processed'].append({
            'player_id': player.id,
            'player_name': player.name,
            'suspension_added': 2,
            'total_suspension': player.suspension_matches,
        })
        results['suspensions_triggered'].append({
            'player_id': player.id,
            'player_name': player.name,
            'reason': 'direct red card',
            'suspension_matches': player.suspension_matches,
        })

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
