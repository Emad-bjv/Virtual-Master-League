from django.contrib import admin
from .models import Pack, PackPlayer, PackOpeningSession


@admin.register(Pack)
class PackAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'tier', 'cost_gems', 'cost_usd', 'cost_irr', 'purchase_method', 'is_active', 'total_players_count', 'unclaimed_players_count']
    list_filter = ['tier', 'purchase_method', 'is_active']
    search_fields = ['name', 'description', 'featured_team']


@admin.register(PackPlayer)
class PackPlayerAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'position', 'overall', 'pack', 'rarity', 'is_claimed', 'claimed_by_team']
    list_filter = ['pack', 'position', 'rarity', 'is_claimed']
    search_fields = ['name', 'pack__name']


@admin.register(PackOpeningSession)
class PackOpeningSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'team', 'pack', 'status', 'picked_card', 'payment_method', 'cost', 'created_at']
    list_filter = ['status', 'payment_method', 'pack']
    search_fields = ['team__name', 'pack__name']
