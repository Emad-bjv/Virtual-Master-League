from rest_framework import serializers
from .models import WeeklyTask, TeamTaskProgress, SeasonPassLevel, TeamSeasonPass
from teams.models import Player, Team

class WeeklyTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyTask
        fields = ['id', 'title', 'task_type', 'target_value', 'reward_xp', 'week_number', 'is_active']


class TeamTaskProgressSerializer(serializers.ModelSerializer):
    task = WeeklyTaskSerializer(read_only=True)

    class Meta:
        model = TeamTaskProgress
        fields = ['id', 'task', 'current_value', 'is_completed', 'is_claimed', 'updated_at']


class SeasonPassLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeasonPassLevel
        fields = [
            'id', 'level', 'xp_required', 'reward_title',
            'free_reward_coins', 'free_reward_gems',
            'vip_reward_coins', 'vip_reward_gems',
            'vip_reward_player_rarity', 'is_final_level'
        ]


class AssignedLegendSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ['id', 'name', 'position', 'overall', 'age', 'base_stamina', 'rarity']


class TeamSeasonPassSerializer(serializers.ModelSerializer):
    assigned_legend_player = AssignedLegendSerializer(read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_logo = serializers.CharField(source='team.logo', read_only=True)

    class Meta:
        model = TeamSeasonPass
        fields = [
            'id', 'team', 'team_name', 'team_logo', 'current_xp', 'current_level',
            'is_vip', 'claimed_levels', 'assigned_legend_player', 'legend_claimed'
        ]

