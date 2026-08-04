from django.contrib import admin
from .models import GachaPack, GachaPity, PackOpeningLog


@admin.register(GachaPack)
class GachaPackAdmin(admin.ModelAdmin):
    list_display = ('name', 'cost_usd', 'rate_rare', 'rate_epic', 'rate_legendary', 'is_active')
    list_filter = ('is_active',)


@admin.register(GachaPity)
class GachaPityAdmin(admin.ModelAdmin):
    list_display = ('team', 'counter', 'total_pulls', 'updated_at')
    search_fields = ('team__name',)


@admin.register(PackOpeningLog)
class PackOpeningLogAdmin(admin.ModelAdmin):
    list_display = ('team', 'pack', 'player_obtained', 'rarity_drawn', 'pity_applied', 'cost_usd', 'opened_at')
    list_filter = ('rarity_drawn', 'pity_applied', 'opened_at')
    search_fields = ('team__name', 'player_obtained__name')
