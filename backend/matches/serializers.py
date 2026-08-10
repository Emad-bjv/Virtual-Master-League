from rest_framework import serializers
from .models import (
    LiveSubstitutionRequest, Match, MatchEvent, PlayerMatchStat,
    MatchTeamStat, LeagueStanding
)
from teams.serializers import TeamSerializer


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

        if player_out.team != team or player_in.team != team:
             raise serializers.ValidationError("بازیکنان باید عضو تیم شما باشند.")

        return data


class MatchSerializer(serializers.ModelSerializer):
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)

    class Meta:
        model = Match
        fields = '__all__'


class MatchEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchEvent
        fields = '__all__'


class PlayerMatchStatSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.name', read_only=True)
    player_position = serializers.CharField(source='player.position', read_only=True)

    class Meta:
        model = PlayerMatchStat
        fields = ['id', 'match', 'player', 'player_name', 'player_position',
                  'was_starter', 'minutes_played', 'rating']
        read_only_fields = ['id']


class MatchTeamStatSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = MatchTeamStat
        fields = ['id', 'match', 'team', 'team_name',
                  'possession_percent', 'shots', 'shots_on_target',
                  'corners', 'fouls', 'offsides']
        read_only_fields = ['id']


class MatchDetailSerializer(serializers.ModelSerializer):
    """Full match detail: events + team stats + player ratings."""
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)
    events = MatchEventSerializer(many=True, read_only=True)
    team_stats = MatchTeamStatSerializer(many=True, read_only=True)
    player_stats = PlayerMatchStatSerializer(many=True, read_only=True)

    class Meta:
        model = Match
        fields = [
            'id', 'tournament', 'round_name', 'status', 'half_status',
            'home_team', 'home_team_name', 'away_team', 'away_team_name',
            'home_score', 'away_score', 'date', 'is_knockout',
            'importance_multiplier', 'standings_processed',
            'events', 'team_stats', 'player_stats'
        ]


class MatchSummarySerializer(serializers.ModelSerializer):
    """Lightweight match summary for history lists."""
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)
    tournament_name = serializers.CharField(source='tournament.name', read_only=True)

    class Meta:
        model = Match
        fields = [
            'id', 'tournament', 'tournament_name', 'round_name',
            'home_team', 'home_team_name', 'away_team', 'away_team_name',
            'home_score', 'away_score', 'status', 'date'
        ]


class LeagueStandingSerializer(serializers.ModelSerializer):
    team_id = serializers.IntegerField(source='team.id', read_only=True)
    name = serializers.CharField(source='team.name', read_only=True)
    gf = serializers.IntegerField(source='goals_for', read_only=True)
    ga = serializers.IntegerField(source='goals_against', read_only=True)
    gd = serializers.SerializerMethodField()

    class Meta:
        model = LeagueStanding
        fields = ['team_id', 'name', 'played', 'won', 'drawn', 'lost',
                  'gf', 'ga', 'gd', 'points']

    def get_gd(self, obj):
        return obj.goal_difference
