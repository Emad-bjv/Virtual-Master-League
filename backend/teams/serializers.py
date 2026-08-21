from rest_framework import serializers
from .models import Team, Player, ClubFacilities, TeamGamePlan


class ClubFacilitiesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubFacilities
        fields = '__all__'


class TeamGamePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamGamePlan
        fields = '__all__'
        read_only_fields = ['id', 'team', 'is_submitted', 'submitted_at']


class PlayerSerializer(serializers.ModelSerializer):
    stamina_status = serializers.CharField(read_only=True)
    is_stamina_locked = serializers.BooleanField(read_only=True)
    loan_owner_team_name = serializers.CharField(source='loan_owner_team.name', read_only=True, allow_null=True)
    photo_url = serializers.SerializerMethodField()
    xp_to_next_level = serializers.SerializerMethodField()
    xp_progress_percent = serializers.SerializerMethodField()
    next_level_gem_cost = serializers.SerializerMethodField()
    next_level_target_ovr = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = '__all__'

    def get_photo_url(self, obj):
        import urllib.parse
        return f"/players/{urllib.parse.quote(obj.name)}.png"

    def get_xp_to_next_level(self, obj):
        if obj.level >= 20:
            return 0
        from .level_engine import get_xp_required
        return get_xp_required(obj.level)

    def get_xp_progress_percent(self, obj):
        if obj.level >= 20:
            return 100
        required = self.get_xp_to_next_level(obj)
        if required == 0:
            return 0
        return min(100, int((obj.xp / required) * 100))

    def get_next_level_gem_cost(self, obj):
        if obj.level >= 20:
            return 0
        from .level_engine import get_gem_boost_cost
        return get_gem_boost_cost(obj.level)

    def get_next_level_target_ovr(self, obj):
        if obj.level >= 20:
            return obj.overall
        from .level_engine import calculate_gem_boost_ovr
        base = obj.base_overall or obj.overall
        return calculate_gem_boost_ovr(base, obj.level + 1)


class TeamSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    facilities = ClubFacilitiesSerializer(read_only=True)
    gameplan = TeamGamePlanSerializer(read_only=True)
    manager_username = serializers.CharField(source='manager.username', read_only=True, default=None)
    manager_full_name = serializers.CharField(source='manager.full_name', read_only=True, default=None)
    manager_birth_date = serializers.DateField(source='manager.birth_date', read_only=True, default=None)

    class Meta:
        model = Team
        fields = '__all__'


class GamePlanUpdateSerializer(serializers.Serializer):
    player_id = serializers.IntegerField()
    x_coord = serializers.FloatField()
    y_coord = serializers.FloatField()
    position = serializers.CharField(max_length=3)
    is_starting = serializers.BooleanField()

    def validate(self, data):
        """
        Prevent stamina-locked, injured, or suspended players from being placed in the starting lineup.
        """
        if data.get('is_starting'):
            try:
                player = Player.objects.get(id=data['player_id'])
                if player.suspension_matches > 0:
                    raise serializers.ValidationError(
                        f"بازیکن {player.name} به دلیل محرومیت ({player.suspension_matches} بازی باقی‌مانده) "
                        f"نمی‌تواند در ترکیب اصلی قرار گیرد."
                    )
                if player.is_stamina_locked:
                    raise serializers.ValidationError(
                        f"بازیکن {player.name} استقامت زیر 30% دارد "
                        f"(فعلی: {player.virtual_stamina}%) و نمی‌تواند در ترکیب اصلی قرار گیرد."
                    )
                if player.is_injured:
                    raise serializers.ValidationError(
                        f"بازیکن {player.name} مصدوم است و نمی‌تواند بازی کند."
                    )
            except Player.DoesNotExist:
                raise serializers.ValidationError(
                    f"بازیکن با شناسه {data['player_id']} یافت نشد."
                )
        return data
