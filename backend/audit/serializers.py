from rest_framework import serializers
from .models import AdminAuditLog
from users.serializers import UserSerializer
from teams.serializers import TeamSerializer, PlayerSerializer

class AdminAuditLogSerializer(serializers.ModelSerializer):
    admin_user_details = serializers.SerializerMethodField()
    team_name = serializers.CharField(source='target_team.name', read_only=True)
    player_name = serializers.CharField(source='target_player.name', read_only=True)

    class Meta:
        model = AdminAuditLog
        fields = [
            'id', 'admin_user', 'admin_user_details', 'action_type',
            'target_team', 'team_name', 'target_player', 'player_name',
            'before_value', 'after_value', 'reason', 'created_at'
        ]
        read_only_fields = fields

    def get_admin_user_details(self, obj):
        if obj.admin_user:
            return {
                'id': obj.admin_user.id,
                'phone_number': obj.admin_user.phone_number,
                'first_name': obj.admin_user.first_name,
                'last_name': obj.admin_user.last_name,
            }
        return None
