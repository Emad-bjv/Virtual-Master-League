from rest_framework import serializers
from .models import LiveSubstitutionRequest

class LiveSubstitutionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveSubstitutionRequest
        fields = ['id', 'match', 'team', 'player_out', 'player_in', 'minute', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']
        
    def validate(self, data):
        match = data.get('match')
        team = data.get('team')
        player_out = data.get('player_out')
        player_in = data.get('player_in')
        
        if match.status != 'LIVE':
            raise serializers.ValidationError("درخواست تعویض فقط برای بازی‌های در حال برگزاری مجاز است.")
            
        if team not in [match.home_team, match.away_team]:
             raise serializers.ValidationError("این تیم در مسابقه حضور ندارد.")
             
        # Optional: In a full validation, we'd check if players belong to the team
        if player_out.team != team or player_in.team != team:
             raise serializers.ValidationError("بازیکنان باید عضو تیم شما باشند.")
             
        return data
