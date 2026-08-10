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

    class Meta:
        model = Player
        fields = '__all__'


class TeamSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    facilities = ClubFacilitiesSerializer(read_only=True)
    gameplan = TeamGamePlanSerializer(read_only=True)

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
        Prevent stamina-locked players from being placed in the starting lineup.
        """
        if data.get('is_starting'):
            try:
                player = Player.objects.get(id=data['player_id'])
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
