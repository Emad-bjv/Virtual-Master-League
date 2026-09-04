from rest_framework import serializers
from .models import (
    LiveSubstitutionRequest, LiveInGameChangeRequest, Match, MatchEvent, PlayerMatchStat,
    MatchTeamStat, LeagueStanding, MatchGamePlan
)
from teams.serializers import TeamSerializer


class MatchGamePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchGamePlan
        fields = '__all__'
        read_only_fields = ['id', 'match', 'team', 'submitted_at']


class LiveInGameChangeSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_logo = serializers.CharField(source='team.logo', read_only=True)
    coach_name = serializers.CharField(source='coach.username', read_only=True)
    category_display = serializers.CharField(source='get_change_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = LiveInGameChangeRequest
        fields = [
            'id', 'match', 'team', 'team_name', 'team_logo',
            'coach', 'coach_name', 'change_category', 'category_display',
            'title', 'detail', 'diff_data', 'status', 'status_display',
            'minute', 'created_at', 'applied_at'
        ]
        read_only_fields = ['status', 'created_at', 'applied_at']


class LiveSubstitutionRequestSerializer(serializers.ModelSerializer):
    player_out_name = serializers.CharField(source='player_out.name', read_only=True)
    player_in_name = serializers.CharField(source='player_in.name', read_only=True)
    player_out_pos = serializers.CharField(source='player_out.position', read_only=True)
    player_in_pos = serializers.CharField(source='player_in.position', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_logo = serializers.CharField(source='team.logo', read_only=True)

    class Meta:
        model = LiveSubstitutionRequest
        fields = [
            'id', 'match', 'team', 'team_name', 'team_logo',
            'player_out', 'player_out_name', 'player_out_pos',
            'player_in', 'player_in_name', 'player_in_pos',
            'minute', 'status', 'created_at'
        ]
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
    home_team_logo = serializers.CharField(source='home_team.logo', read_only=True)
    away_team_logo = serializers.CharField(source='away_team.logo', read_only=True)
    home_coach_name = serializers.SerializerMethodField()
    away_coach_name = serializers.SerializerMethodField()
    home_lineup_ready = serializers.SerializerMethodField()
    away_lineup_ready = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = '__all__'

    def get_home_coach_name(self, obj):
        if obj.home_team and obj.home_team.manager:
            return obj.home_team.manager.username
        return 'نامشخص'

    def get_away_coach_name(self, obj):
        if obj.away_team and obj.away_team.manager:
            return obj.away_team.manager.username
        return 'نامشخص'

    def get_home_lineup_ready(self, obj):
        if not obj.home_team_id:
            return False
        return obj.gameplans.filter(team_id=obj.home_team_id, is_submitted=True).exists()

    def get_away_lineup_ready(self, obj):
        if not obj.away_team_id:
            return False
        return obj.gameplans.filter(team_id=obj.away_team_id, is_submitted=True).exists()


class MatchEventSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.name', read_only=True)
    player_position = serializers.CharField(source='player.position', read_only=True)
    player_team_id = serializers.IntegerField(source='player.team_id', read_only=True)
    player_team_name = serializers.CharField(source='player.team.name', read_only=True)
    assist_player_name = serializers.CharField(source='assist_player.name', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    emoji = serializers.SerializerMethodField()
    icon = serializers.SerializerMethodField()

    class Meta:
        model = MatchEvent
        fields = '__all__'
        read_only_fields = ['id', 'match']
        extra_kwargs = {
            'player': {'required': False, 'allow_null': True},
            'minute': {'required': False, 'default': 1},
        }

    def get_emoji(self, obj):
        EVENT_EMOJIS = {
            'GOAL': '⚽',
            'ASSIST': '🅰️',
            'OWN_GOAL': '🤦‍♂️',
            'PENALTY_SCORED': '🎯',
            'PENALTY_MISSED': '❌',
            'YELLOW': '🟨',
            'SECOND_YELLOW': '🟨🟥',
            'RED': '🟥',
            'SUB_IN': '🔄',
            'SUB_OUT': '⬅️',
            'INJURY': '🚑',
            'VAR': '🖥️',
            'UNDO_GOAL': '↩️',
            'UNDO_EVENT': '↩️',
            'INFO': '📢',
        }
        return EVENT_EMOJIS.get(obj.event_type, '📢')

    def get_icon(self, obj):
        return self.get_emoji(obj)


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
                  'corners', 'fouls', 'offsides', 'saves']
        read_only_fields = ['id']


class MatchDetailSerializer(serializers.ModelSerializer):
    """Full match detail: events + team stats + player ratings + sub requests + tactical metadata."""
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)
    home_team_logo = serializers.CharField(source='home_team.logo', read_only=True)
    away_team_logo = serializers.CharField(source='away_team.logo', read_only=True)
    home_coach_name = serializers.SerializerMethodField()
    away_coach_name = serializers.SerializerMethodField()
    home_lineup_ready = serializers.SerializerMethodField()
    away_lineup_ready = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()
    team_stats = MatchTeamStatSerializer(many=True, read_only=True)
    player_stats = PlayerMatchStatSerializer(many=True, read_only=True)
    substitution_requests = LiveSubstitutionRequestSerializer(many=True, read_only=True)
    in_game_changes = LiveInGameChangeSerializer(many=True, read_only=True)
    
    # Rule counters & tactical state
    home_subs_count = serializers.SerializerMethodField()
    away_subs_count = serializers.SerializerMethodField()
    home_sub_windows_used = serializers.SerializerMethodField()
    away_sub_windows_used = serializers.SerializerMethodField()
    home_red_cards = serializers.SerializerMethodField()
    away_red_cards = serializers.SerializerMethodField()
    home_preset_name = serializers.SerializerMethodField()
    away_preset_name = serializers.SerializerMethodField()
    home_has_custom_player_edits = serializers.SerializerMethodField()
    away_has_custom_player_edits = serializers.SerializerMethodField()
    home_formation = serializers.SerializerMethodField()
    away_formation = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id', 'tournament', 'round_name', 'status', 'half_status',
            'home_team', 'home_team_name', 'home_team_logo', 'home_coach_name', 'home_lineup_ready',
            'away_team', 'away_team_name', 'away_team_logo', 'away_coach_name', 'away_lineup_ready',
            'home_score', 'away_score', 'home_penalties', 'away_penalties', 'next_match', 'date', 'is_knockout',
            'importance_multiplier', 'standings_processed',
            'stoppage_time', 'current_minute', 'stream_url',
            'home_subs_count', 'away_subs_count',
            'home_sub_windows_used', 'away_sub_windows_used',
            'home_red_cards', 'away_red_cards',
            'home_preset_name', 'away_preset_name',
            'home_has_custom_player_edits', 'away_has_custom_player_edits',
            'home_formation', 'away_formation',
            'events', 'team_stats', 'player_stats', 'substitution_requests', 'in_game_changes'
        ]

    def get_events(self, obj):
        events = obj.events.filter(is_undone=False).order_by('minute', 'id')
        return MatchEventSerializer(events, many=True).data

    def get_home_coach_name(self, obj):
        if obj.home_team and obj.home_team.manager:
            return obj.home_team.manager.username
        return 'نامشخص'

    def get_away_coach_name(self, obj):
        if obj.away_team and obj.away_team.manager:
            return obj.away_team.manager.username
        return 'نامشخص'

    def get_home_lineup_ready(self, obj):
        if not obj.home_team_id:
            return False
        return obj.gameplans.filter(team_id=obj.home_team_id, is_submitted=True).exists()

    def get_away_lineup_ready(self, obj):
        if not obj.away_team_id:
            return False
        return obj.gameplans.filter(team_id=obj.away_team_id, is_submitted=True).exists()

    def get_home_preset_name(self, obj):
        if not obj.home_team_id:
            return ""
        mgp = obj.gameplans.filter(team_id=obj.home_team_id).first()
        if mgp and mgp.preset_name:
            return mgp.preset_name
        tgp = getattr(obj.home_team, 'gameplan', None)
        return tgp.preset_name if tgp else ""

    def get_away_preset_name(self, obj):
        if not obj.away_team_id:
            return ""
        mgp = obj.gameplans.filter(team_id=obj.away_team_id).first()
        if mgp and mgp.preset_name:
            return mgp.preset_name
        tgp = getattr(obj.away_team, 'gameplan', None)
        return tgp.preset_name if tgp else ""

    def get_home_has_custom_player_edits(self, obj):
        if not obj.home_team_id:
            return False
        mgp = obj.gameplans.filter(team_id=obj.home_team_id).first()
        if mgp:
            return mgp.has_custom_player_edits
        tgp = getattr(obj.home_team, 'gameplan', None)
        return tgp.has_custom_player_edits if tgp else False

    def get_away_has_custom_player_edits(self, obj):
        if not obj.away_team_id:
            return False
        mgp = obj.gameplans.filter(team_id=obj.away_team_id).first()
        if mgp:
            return mgp.has_custom_player_edits
        tgp = getattr(obj.away_team, 'gameplan', None)
        return tgp.has_custom_player_edits if tgp else False

    def get_home_formation(self, obj):
        if not obj.home_team_id:
            return "4-3-3"
        mgp = obj.gameplans.filter(team_id=obj.home_team_id).first()
        if mgp and mgp.formation:
            return mgp.formation
        tgp = getattr(obj.home_team, 'gameplan', None)
        return tgp.formation if (tgp and tgp.formation) else (obj.home_team.default_formation or "4-3-3")

    def get_away_formation(self, obj):
        if not obj.away_team_id:
            return "4-3-3"
        mgp = obj.gameplans.filter(team_id=obj.away_team_id).first()
        if mgp and mgp.formation:
            return mgp.formation
        tgp = getattr(obj.away_team, 'gameplan', None)
        return tgp.formation if (tgp and tgp.formation) else (obj.away_team.default_formation or "4-3-3")

    def get_home_subs_count(self, obj):
        if not obj.home_team_id:
            return 0
        return obj.events.filter(
            player__team_id=obj.home_team_id,
            event_type='SUB_IN',
            is_undone=False
        ).count()

    def get_away_subs_count(self, obj):
        if not obj.away_team_id:
            return 0
        return obj.events.filter(
            player__team_id=obj.away_team_id,
            event_type='SUB_IN',
            is_undone=False
        ).count()

    def get_home_sub_windows_used(self, obj):
        if not obj.home_team_id:
            return 0
        sub_minutes = obj.events.filter(
            player__team_id=obj.home_team_id,
            event_type='SUB_IN',
            is_undone=False
        ).exclude(minute=45).values_list('minute', flat=True)
        return len(set(sub_minutes))

    def get_away_sub_windows_used(self, obj):
        if not obj.away_team_id:
            return 0
        sub_minutes = obj.events.filter(
            player__team_id=obj.away_team_id,
            event_type='SUB_IN',
            is_undone=False
        ).exclude(minute=45).values_list('minute', flat=True)
        return len(set(sub_minutes))

    def get_home_red_cards(self, obj):
        if not obj.home_team_id:
            return []
        return list(obj.events.filter(
            player__team_id=obj.home_team_id,
            event_type__in=['RED', 'SECOND_YELLOW'],
            is_undone=False
        ).values_list('player_id', flat=True))

    def get_away_red_cards(self, obj):
        if not obj.away_team_id:
            return []
        return list(obj.events.filter(
            player__team_id=obj.away_team_id,
            event_type__in=['RED', 'SECOND_YELLOW'],
            is_undone=False
        ).values_list('player_id', flat=True))


class MatchSummarySerializer(serializers.ModelSerializer):
    """Lightweight match summary for history lists."""
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)
    home_team_logo = serializers.CharField(source='home_team.logo', read_only=True)
    away_team_logo = serializers.CharField(source='away_team.logo', read_only=True)
    tournament_name = serializers.CharField(source='tournament.name', read_only=True)
    home_preset_name = serializers.SerializerMethodField()
    away_preset_name = serializers.SerializerMethodField()
    home_lineup_ready = serializers.SerializerMethodField()
    away_lineup_ready = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            'id', 'tournament', 'tournament_name', 'round_name',
            'home_team', 'home_team_name', 'home_team_logo',
            'away_team', 'away_team_name', 'away_team_logo',
            'home_score', 'away_score', 'status', 'date',
            'home_preset_name', 'away_preset_name',
            'home_lineup_ready', 'away_lineup_ready'
        ]

    def get_home_lineup_ready(self, obj):
        if not obj.home_team_id:
            return False
        return obj.gameplans.filter(team_id=obj.home_team_id, is_submitted=True).exists()

    def get_away_lineup_ready(self, obj):
        if not obj.away_team_id:
            return False
        return obj.gameplans.filter(team_id=obj.away_team_id, is_submitted=True).exists()

    def get_home_preset_name(self, obj):
        if not obj.home_team_id:
            return ""
        mgp = obj.gameplans.filter(team_id=obj.home_team_id).first()
        if mgp and mgp.preset_name:
            return mgp.preset_name
        tgp = getattr(obj.home_team, 'gameplan', None)
        return tgp.preset_name if tgp else ""

    def get_away_preset_name(self, obj):
        if not obj.away_team_id:
            return ""
        mgp = obj.gameplans.filter(team_id=obj.away_team_id).first()
        if mgp and mgp.preset_name:
            return mgp.preset_name
        tgp = getattr(obj.away_team, 'gameplan', None)
        return tgp.preset_name if tgp else ""


class LeagueStandingSerializer(serializers.ModelSerializer):
    team_id = serializers.IntegerField(source='team.id', read_only=True)
    name = serializers.CharField(source='team.name', read_only=True)
    logo = serializers.CharField(source='team.logo', read_only=True)
    gf = serializers.IntegerField(source='goals_for', read_only=True)
    ga = serializers.IntegerField(source='goals_against', read_only=True)
    gd = serializers.SerializerMethodField()
    raw_points = serializers.IntegerField(source='points', read_only=True)
    points = serializers.SerializerMethodField()

    class Meta:
        model = LeagueStanding
        fields = [
            'id', 'team_id', 'name', 'logo', 'played', 'won', 'drawn', 'lost',
            'gf', 'ga', 'gd', 'raw_points', 'points', 'points_deduction',
            'points_deduction_reason', 'is_manually_overridden'
        ]

    def get_gd(self, obj):
        return obj.goal_difference

    def get_points(self, obj):
        return obj.net_points
