from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    team_id = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'team_id',
            'team_name',
            'role',
            'virtual_dollars',
            'avatar',
            'rank',
            'points',
            'is_staff',
            'is_superuser',
        ]
        read_only_fields = ['id', 'username', 'role', 'rank', 'points', 'virtual_dollars', 'is_staff', 'is_superuser']

    def get_team_id(self, obj):
        if hasattr(obj, 'team') and obj.team:
            return obj.team.id
        return None

    def get_team_name(self, obj):
        if hasattr(obj, 'team') and obj.team:
            return obj.team.name
        return None


class LeaderboardUserSerializer(serializers.ModelSerializer):
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'rank',
            'username',
            'team_name',
            'role',
            'points',
            'virtual_dollars',
            'avatar',
        ]
        read_only_fields = fields

    def get_team_name(self, obj):
        if hasattr(obj, 'team') and obj.team:
            return obj.team.name
        return None
