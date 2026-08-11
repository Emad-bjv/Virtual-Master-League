from django.db import models
from django.conf import settings

class AdminAuditLog(models.Model):
    admin_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=40)
    target_team = models.ForeignKey('teams.Team', on_delete=models.SET_NULL, null=True, blank=True)
    target_player = models.ForeignKey('teams.Player', on_delete=models.SET_NULL, null=True, blank=True)
    before_value = models.JSONField(null=True, blank=True)
    after_value = models.JSONField(null=True, blank=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action_type} by {self.admin_user} at {self.created_at}"
