from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True, default=None)

    class Meta:
        model = Notification
        fields = [
            'id',
            'team',
            'team_name',
            'match',
            'target_role',
            'action_url',
            'category',
            'title',
            'message',
            'is_read',
            'is_dismissed',
            'dismissed_at',
            'created_at',
        ]
        read_only_fields = fields
