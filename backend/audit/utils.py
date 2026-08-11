from .models import AdminAuditLog

def log_admin_action(admin_user, action_type, target_team=None, target_player=None,
                      before_value=None, after_value=None, reason=""):
    """
    Helper function to log sensitive manual actions taken by administrators.
    """
    AdminAuditLog.objects.create(
        admin_user=admin_user if admin_user.is_authenticated else None, 
        action_type=action_type,
        target_team=target_team, 
        target_player=target_player,
        before_value=before_value, 
        after_value=after_value, 
        reason=reason
    )
