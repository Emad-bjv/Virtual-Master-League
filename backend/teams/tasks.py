"""
Celery Tasks — Stamina & Growth Engine
=======================================

Scheduled and on-demand tasks for stamina and player growth systems.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='teams.apply_daily_recovery')
def task_apply_daily_recovery():
    """
    Celery task: Apply daily recovery (+20%) to all resting players.
    """
    from teams.stamina_engine import apply_daily_recovery_all

    results = apply_daily_recovery_all()

    recovered_count = len(results)
    logger.info(f"[Stamina Recovery] Applied recovery to {recovered_count} players.")

    return {
        'recovered_count': recovered_count,
        'details': results,
    }


@shared_task(name='teams.apply_post_match_fatigue')
def task_apply_post_match_fatigue(match_id: int):
    """
    Celery task: Apply fatigue to all players who participated in a match.
    """
    from matches.models import Match
    from teams.stamina_engine import apply_post_match_fatigue

    try:
        match = Match.objects.select_related('home_team', 'away_team').get(id=match_id)
    except Match.DoesNotExist:
        logger.error(f"[Stamina Fatigue] Match {match_id} not found.")
        return {'error': f'Match {match_id} not found'}

    if match.status != 'FINISHED':
        logger.warning(f"[Stamina Fatigue] Match {match_id} is not FINISHED (status={match.status}).")
        return {'error': f'Match {match_id} is not finished yet'}

    results = apply_post_match_fatigue(match)

    logger.info(
        f"[Stamina Fatigue] Processed match {match_id}: "
        f"{match.home_team.name} vs {match.away_team.name}. "
        f"Affected {len(results)} players."
    )

    return {
        'match_id': match_id,
        'affected_players': len(results),
        'details': results,
    }


@shared_task(name='teams.run_growth_evaluation')
def task_run_growth_evaluation(match_ids: list, period_name: str):
    """
    Celery task: Run player growth & decline evaluation for a list of match IDs.

    Args:
        match_ids: List of finished match IDs included in the period.
        period_name: Name of cycle, e.g. "Week 6 Evaluation".
    """
    from teams.growth_engine import run_evaluation_cycle

    logger.info(f"[Growth Engine] Starting evaluation '{period_name}' for {len(match_ids)} matches.")

    result = run_evaluation_cycle(match_ids=match_ids, period_name=period_name)

    logger.info(
        f"[Growth Engine] Finished '{period_name}': {result['upgrades_count']} upgrades, "
        f"{result['downgrades_count']} downgrades out of {result['processed_count']} processed players."
    )

    return result


@shared_task(name='teams.run_academy_graduation')
def task_run_academy_graduation():
    """
    Celery task: Run academy graduation at the end of each season.

    For each team:
    - If roster is full (>= 25 players), skip graduation.
    - Otherwise, generate `graduates_count(team)` number of young players
      with OVR based on the academy facility level.

    Called from: matches/views.py (or admin) when a Season is closed (Season.is_active = False).
    """
    from teams.models import Team
    from teams.growth_engine import generate_academy_prospect, graduates_count
    from gacha.services import generate_random_player

    results = []
    teams_processed = 0
    total_graduated = 0

    for team in Team.objects.select_related('facilities').all():
        current_count = team.players.count()
        max_cap = team.max_squad_size
        if current_count >= max_cap:
            logger.info(
                f"[Academy Graduation] Team '{team.name}' skipped: roster full ({current_count}/{max_cap})."
            )
            continue

        # How many players can we add before hitting max_squad_size?
        available_slots = max_cap - current_count

        count = graduates_count(team)
        count = min(count, available_slots)  # Never exceed dynamic squad cap
        target_ovr = generate_academy_prospect(team)

        team_graduates = []
        for _ in range(count):
            player = generate_random_player('RARE', team)
            # Override with academy-specific values
            player.age = 17
            player.overall = target_ovr
            player.rarity = 'REGULAR'  # Academy players are regular cards
            player.save(update_fields=['age', 'overall', 'rarity'])

            logger.info(
                f"[Academy Graduation] {team.name}: graduated {player.name} "
                f"(OVR {target_ovr}, age 17)."
            )
            team_graduates.append({'player_id': player.id, 'player_name': player.name, 'ovr': target_ovr})

        results.append({
            'team': team.name,
            'team_id': team.id,
            'graduates': team_graduates,
            'graduates_count': len(team_graduates),
        })
        teams_processed += 1
        total_graduated += len(team_graduates)

    logger.info(
        f"[Academy Graduation] Completed: {total_graduated} players graduated across {teams_processed} teams."
    )

    return {
        'teams_processed': teams_processed,
        'total_graduated': total_graduated,
        'results': results,
    }
