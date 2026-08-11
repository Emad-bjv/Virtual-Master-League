from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from .models import AdminAuditLog
from .serializers import AdminAuditLogSerializer

class AdminAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnlyViewSet to prevent anyone from modifying/deleting audit logs via API.
    """
    queryset = AdminAuditLog.objects.all().select_related('admin_user', 'target_team', 'target_player')
    serializer_class = AdminAuditLogSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        team_id = self.request.query_params.get('target_team')
        action_type = self.request.query_params.get('action_type')
        
        if team_id:
            queryset = queryset.filter(target_team_id=team_id)
        if action_type:
            queryset = queryset.filter(action_type=action_type)
            
        return queryset
