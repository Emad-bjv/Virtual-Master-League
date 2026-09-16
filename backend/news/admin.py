from django.contrib import admin
from .models import LeagueNews, NewsReaction


@admin.register(LeagueNews)
class LeagueNewsAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_published', 'is_pinned', 'views_count', 'created_at')
    list_filter = ('category', 'is_published', 'is_pinned', 'created_at')
    search_fields = ('title', 'summary', 'content')
    ordering = ('-is_pinned', '-created_at')


@admin.register(NewsReaction)
class NewsReactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'news', 'reaction_type', 'created_at')
    list_filter = ('reaction_type', 'created_at')
