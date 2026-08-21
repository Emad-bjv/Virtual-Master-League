from django.db import transaction
from teams.models import Player
from realtime.events import notify_admin
from transfers.models import TransferLog

def process_post_match_loans(team):
    """
    Called after a team plays a match. Decrements loan_matches_left for all 
    borrowed players currently playing for this team. If it reaches 0, returns them.
    """
    if not team:
        return
        
    with transaction.atomic():
        # Get all players currently borrowed by this team
        borrowed_players = Player.objects.select_for_update().filter(
            team=team, 
            loan_owner_team__isnull=False,
            loan_matches_left__gt=0
        )
        
        for player in borrowed_players:
            player.loan_matches_left -= 1
            if player.loan_matches_left == 0:
                # Time to return!
                original_owner = player.loan_owner_team
                
                # Move back to original team
                player.team = original_owner
                player.loan_owner_team = None
                
                # Clear squad positioning just in case
                player.is_starting = False
                player.x_coord = 0.0
                player.y_coord = 0.0
                player.save()
                
                desc = f"پایان قرارداد قرضی: {player.name} پس از اتمام بازی‌های قرضی خود از {team.name} به تیم اصلی‌اش ({original_owner.name}) بازگشت."
                TransferLog.objects.create(
                    event_type='LOAN_EXPIRED',
                    description=desc,
                    related_offer=None
                )
                
                # Notify both coaches and admin
                notify_admin(f"🔄 پایان قرارداد قرضی: {player.name} از {team.name} به {original_owner.name} بازگشت.")
                
                # Maintain starting XI integrity for the team that lost the loaned player
                from transfers.negotiation_services import ensure_team_starting_eleven
                ensure_team_starting_eleven(team)
            else:
                player.save(update_fields=['loan_matches_left'])
