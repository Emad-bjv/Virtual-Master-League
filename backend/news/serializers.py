from rest_framework import serializers
from django.utils import timezone
from .models import LeagueNews, NewsReaction


class LeagueNewsSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    related_player_name = serializers.CharField(source='related_player.name', read_only=True)
    related_player_photo = serializers.SerializerMethodField()
    related_team_name = serializers.CharField(source='related_team.name', read_only=True)
    related_team_logo = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    tournament_name = serializers.SerializerMethodField()
    tournament_is_active = serializers.SerializerMethodField()

    class Meta:
        model = LeagueNews
        fields = [
            'id', 'title', 'subtitle', 'category', 'category_display',
            'summary', 'content', 'image_url', 'is_pinned', 'is_published',
            'views_count', 'reactions_count', 'user_reaction', 'author_name',
            'related_player', 'related_player_name', 'related_player_photo',
            'related_team', 'related_team_name', 'related_team_logo',
            'related_match', 'tournament_name', 'tournament_is_active',
            'source_event_type', 'source_event_id',
            'created_at', 'updated_at', 'time_ago'
        ]
        read_only_fields = ['id', 'views_count', 'reactions_count', 'created_at', 'updated_at']

    def get_tournament_name(self, obj):
        if obj.related_match and obj.related_match.tournament:
            return obj.related_match.tournament.name
        return None

    def get_tournament_is_active(self, obj):
        if obj.related_match and obj.related_match.tournament:
            return obj.related_match.tournament.is_active
        return None

    def get_related_player_photo(self, obj):
        if obj.related_player and obj.related_player.custom_photo:
            try:
                return obj.related_player.custom_photo.url
            except Exception:
                return None
        return None

    def get_related_team_logo(self, obj):
        if obj.related_team and obj.related_team.logo:
            try:
                return obj.related_team.logo.url
            except Exception:
                return None
        return None

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            # Check cached or query
            reaction = obj.user_reactions.filter(user=request.user).first()
            return reaction.reaction_type if reaction else None
        return None

    def get_time_ago(self, obj):
        now = timezone.now()
        diff = now - obj.created_at
        seconds = diff.total_seconds()

        if seconds < 60:
            return 'هم‌اکنون'
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f'{minutes} دقیقه پیش'
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f'{hours} ساعت پیش'
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f'{days} روز پیش'
        else:
            return obj.created_at.strftime('%Y/%m/%d')
