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


def resolve_player_photo_url(obj):
    import urllib.parse
    name = (getattr(obj, 'name', None) or '').strip()
    pos = getattr(obj, 'position', '')
    ovr = getattr(obj, 'overall', 0) or 0
    team_name = getattr(obj.team, 'name', '') if getattr(obj, 'team', None) else ''

    if name in ['L. Martínez', 'L. Martinez']:
        if pos in ['CF', 'SS'] or ovr >= 86 or 'inter' in team_name.lower():
            return "/players/Lautaro%20Mart%C3%ADnez.png?v=2"
        return "/players/Lisandro%20Mart%C3%ADnez.png?v=2"

    if name == 'J. Bellingham':
        if ovr >= 88 or 'madrid' in team_name.lower():
            return "/players/Jude%20Bellingham.png?v=2"
        return "/players/Jobe%20Bellingham.png?v=2"

    return f"/players/{urllib.parse.quote(name)}.png?v=2"


class PlayerSerializer(serializers.ModelSerializer):
    stamina_status = serializers.CharField(read_only=True)
    is_stamina_locked = serializers.BooleanField(read_only=True)
    is_suspended = serializers.BooleanField(read_only=True)
    loan_owner_team_name = serializers.CharField(source='loan_owner_team.name', read_only=True, allow_null=True)
    photo_url = serializers.SerializerMethodField()
    xp_to_next_level = serializers.SerializerMethodField()
    xp_progress_percent = serializers.SerializerMethodField()
    next_level_gem_cost = serializers.SerializerMethodField()
    next_level_target_ovr = serializers.SerializerMethodField()
    records_by_tab = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = '__all__'

    def get_photo_url(self, obj):
        return resolve_player_photo_url(obj)

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

    def _compute_stats_for_filter(self, obj, match_q=None):
        from matches.models import PlayerMatchStat, MatchEvent
        from django.db.models import Avg, Q
        
        stat_qs = PlayerMatchStat.objects.filter(player=obj, match__status='FINISHED')
        event_qs = MatchEvent.objects.filter(is_undone=False, match__status='FINISHED')
        
        if match_q:
            stat_qs = stat_qs.filter(match_q)
            event_qs = event_qs.filter(match_q)
            
        matches_played = stat_qs.count()
        goals = event_qs.filter(player=obj, event_type__in=['GOAL', 'PENALTY_SCORED']).count()
        assists = event_qs.filter(Q(assist_player=obj) | Q(player=obj, event_type='ASSIST')).count()
        avg = stat_qs.filter(rating__isnull=False).aggregate(avg=Avg('rating'))['avg']
        yellow = event_qs.filter(player=obj, event_type__in=['YELLOW', 'SECOND_YELLOW']).count()
        red = event_qs.filter(player=obj, event_type__in=['RED', 'SECOND_YELLOW']).count()
        
        return {
            'matches_played': matches_played,
            'goals': goals,
            'assists': assists,
            'avg_rating': round(float(avg), 1) if avg is not None else None,
            'yellow_cards': yellow,
            'red_cards': red,
        }

    def get_records_by_tab(self, obj):
        from django.db.models import Q
        overall = self._compute_stats_for_filter(obj)
        league = self._compute_stats_for_filter(obj, Q(match__tournament__tournament_type='LEAGUE') | (Q(match__is_knockout=False) & Q(match__tournament__isnull=False)))
        cup = self._compute_stats_for_filter(obj, Q(match__tournament__tournament_type='CUP') | Q(match__is_knockout=True))
        friendly = self._compute_stats_for_filter(obj, Q(match__tournament__tournament_type='FRIENDLY') | Q(match__tournament__isnull=True))
        return {
            'overall': overall,
            'league': league,
            'cup': cup,
            'friendly': friendly,
        }

    def get_matches_played(self, obj):
        from matches.models import PlayerMatchStat
        return PlayerMatchStat.objects.filter(player=obj, match__status='FINISHED').count()

    def get_goals(self, obj):
        from matches.models import MatchEvent
        return MatchEvent.objects.filter(
            player=obj,
            event_type__in=['GOAL', 'PENALTY_SCORED'],
            is_undone=False,
            match__status='FINISHED'
        ).count()

    def get_assists(self, obj):
        from matches.models import MatchEvent
        from django.db.models import Q
        return MatchEvent.objects.filter(
            Q(assist_player=obj) | Q(player=obj, event_type='ASSIST'),
            is_undone=False,
            match__status='FINISHED'
        ).count()

    def get_avg_rating(self, obj):
        from matches.models import PlayerMatchStat
        from django.db.models import Avg
        avg = PlayerMatchStat.objects.filter(
            player=obj,
            match__status='FINISHED',
            rating__isnull=False
        ).aggregate(avg=Avg('rating'))['avg']
        return round(float(avg), 1) if avg is not None else None

    def get_yellow_cards(self, obj):
        from matches.models import MatchEvent
        return MatchEvent.objects.filter(
            player=obj,
            event_type__in=['YELLOW', 'SECOND_YELLOW'],
            is_undone=False,
            match__status='FINISHED'
        ).count()

    def get_red_cards(self, obj):
        from matches.models import MatchEvent
        return MatchEvent.objects.filter(
            player=obj,
            event_type__in=['RED', 'SECOND_YELLOW'],
            is_undone=False,
            match__status='FINISHED'
        ).count()


class TeamSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)
    facilities = ClubFacilitiesSerializer(read_only=True)
    gameplan = TeamGamePlanSerializer(read_only=True)
    manager_username = serializers.CharField(source='manager.username', read_only=True, default=None)
    manager_full_name = serializers.CharField(source='manager.full_name', read_only=True, default=None)
    manager_birth_date = serializers.DateField(source='manager.birth_date', read_only=True, default=None)
    max_squad_size = serializers.IntegerField(read_only=True)
    injury_heal_cost = serializers.IntegerField(read_only=True)

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
