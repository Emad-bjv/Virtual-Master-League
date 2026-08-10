from rest_framework import serializers
from .models import GlobalSettings

class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = ['current_season', 'current_week', 'is_transfer_window_open']
