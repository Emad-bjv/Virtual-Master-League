from rest_framework import serializers
from .models import WeeklyTask, TeamTaskProgress, SeasonPassLevel, TeamSeasonPass

class WeeklyTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyTask
        fields = ['id', 'title', 'task_type', 'target_value', 'reward_xp', 'week_number']

class TeamTaskProgressSerializer(serializers.ModelSerializer):
    task = WeeklyTaskSerializer(read_only=True)

    class Meta:
        model = TeamTaskProgress
        fields = ['id', 'task', 'current_value', 'is_completed', 'is_claimed', 'updated_at']

class SeasonPassLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeasonPassLevel
        fields = ['level', 'xp_required', 'free_reward_gems', 'vip_reward_gems', 'vip_reward_player_rarity', 'is_final_level']

class TeamSeasonPassSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamSeasonPass
        fields = ['current_xp', 'current_level', 'is_vip', 'claimed_levels']
