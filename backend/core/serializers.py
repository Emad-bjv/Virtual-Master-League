from rest_framework import serializers
from .models import GlobalSettings
from decimal import Decimal

class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = '__all__'

    def validate(self, data):
        rare = data.get('gacha_rate_rare', getattr(self.instance, 'gacha_rate_rare', Decimal('70.00')))
        epic = data.get('gacha_rate_epic', getattr(self.instance, 'gacha_rate_epic', Decimal('25.00')))
        legendary = data.get('gacha_rate_legendary', getattr(self.instance, 'gacha_rate_legendary', Decimal('5.00')))
        
        rates_sum = Decimal(str(rare)) + Decimal(str(epic)) + Decimal(str(legendary))
        if abs(rates_sum - Decimal('100.00')) > Decimal('0.01'):
            raise serializers.ValidationError({
                'gacha_rate_rare': f"مجموع شانس‌های دراپ گاچا باید دقیقاً ۱۰۰٪ باشد. (مجموع فعلی: {rates_sum}%)"
            })
        return data

class FeatureFlagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = [
            'site_title',
            'maintenance_mode',
            'feature_transfer_market',
            'feature_store',
            'feature_gacha',
            'feature_live_broadcast',
            'feature_season_pass',
            'feature_notifications',
            'feature_registration',
            'feature_club_facilities',
            'feature_game_plan',
        ]

