"""
matches/signals.py

Signal: When a Match is saved with status='FINISHED' and standings_processed=False,
        automatically update LeagueStanding rows and distribute match rewards.
        After processing, set standings_processed=True to prevent double-processing.
"""
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Match, LeagueStanding


@receiver(post_save, sender=Match)
def update_standings_and_rewards(sender, instance, **kwargs):
    """
    Auto-update league table and distribute rewards when a LEAGUE match finishes.
    Guard: standings_processed prevents duplicate processing.
    """
    if instance.status != 'FINISHED':
        return
    if instance.standings_processed:
        return
    if not instance.tournament:
        return
    if instance.tournament.tournament_type != 'LEAGUE':
        return
    if not instance.home_team or not instance.away_team:
        return

    with transaction.atomic():
        # Re-fetch with lock to prevent race conditions
        match = Match.objects.select_for_update().get(pk=instance.pk)
        if match.standings_processed:
            return  # Another process got here first

        home = match.home_team
        away = match.away_team
        tournament = match.tournament

        home_score = match.home_score
        away_score = match.away_score

        # Determine result
        if home_score > away_score:
            home_result = ('won', 3)
            away_result = ('lost', 0)
        elif home_score == away_score:
            home_result = ('drawn', 1)
            away_result = ('drawn', 1)
        else:
            home_result = ('lost', 0)
            away_result = ('won', 3)

        def _update_standing(team, result_field, pts, gf, ga):
            standing, _ = LeagueStanding.objects.select_for_update().get_or_create(
                tournament=tournament, team=team,
                defaults={'played': 0, 'won': 0, 'drawn': 0, 'lost': 0,
                          'goals_for': 0, 'goals_against': 0, 'points': 0}
            )
            standing.played += 1
            setattr(standing, result_field, getattr(standing, result_field) + 1)
            standing.goals_for += gf
            standing.goals_against += ga
            standing.points += pts
            standing.save()

        _update_standing(home, home_result[0], home_result[1], home_score, away_score)
        _update_standing(away, away_result[0], away_result[1], away_score, home_score)

        # Distribute match rewards via economy engine
        try:
            from economy.services import distribute_match_rewards
            distribute_match_rewards(match)
        except Exception:
            pass  # Never block standings update if economy fails
            
        # Update Season Pass Tasks
        try:
            from season_pass.services import increment_task_progress
            
            # WIN_MATCHES
            if home_result[0] == 'won':
                increment_task_progress(home, 'WIN_MATCHES', 1)
            elif away_result[0] == 'won':
                increment_task_progress(away, 'WIN_MATCHES', 1)
                
            # SCORE_GOALS
            if home_score > 0:
                increment_task_progress(home, 'SCORE_GOALS', home_score)
            if away_score > 0:
                increment_task_progress(away, 'SCORE_GOALS', away_score)
                
            # CLEAN_SHEETS
            if away_score == 0:
                increment_task_progress(home, 'CLEAN_SHEETS', 1)
            if home_score == 0:
                increment_task_progress(away, 'CLEAN_SHEETS', 1)
                
        except Exception:
            pass # Never block standings

        # Process disciplinary actions (yellow/red card suspensions)
        try:
            from matches.tasks import task_process_disciplinary_actions, task_decrement_suspended_players
            task_process_disciplinary_actions.delay(match.id)
            task_decrement_suspended_players.delay(match.id)
        except Exception as e:
            # Log but never block standings processing
            import logging
            logging.getLogger(__name__).error(f"[Signal] Disciplinary task dispatch failed: {e}")

        # Update Loan Statuses
        try:
            from transfers.loan_services import process_post_match_loans
            process_post_match_loans(home)
            process_post_match_loans(away)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[Signal] Loan processing failed: {e}")

        # Mark as processed — prevent duplicate runs
        match.standings_processed = True
        match.save(update_fields=['standings_processed'])
