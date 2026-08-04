from rest_framework import serializers
from .models import GachaPack, GachaPity, PackOpeningLog


class GachaPackSerializer(serializers.ModelSerializer):
    class Meta:
        model = GachaPack
        fields = ['id', 'name', 'cost_usd', 'rate_rare', 'rate_epic', 'rate_legendary', 'is_active']


class GachaPitySerializer(serializers.ModelSerializer):
    class Meta:
        model = GachaPity
        fields = ['counter', 'total_pulls']


class PackOpeningLogSerializer(serializers.ModelSerializer):
    pack_name = serializers.CharField(source='pack.name', read_only=True)
    player_name = serializers.CharField(source='player_obtained.name', read_only=True)

    class Meta:
        model = PackOpeningLog
        fields = ['id', 'pack_name', 'player_name', 'rarity_drawn', 'pity_applied', 'cost_usd', 'opened_at']
