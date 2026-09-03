from django.contrib import admin
from .models import Team, Player, PlayerGrowthLog, PlayerLevelConfig, PlayerLevelUpLog


class PlayerGrowthLogInline(admin.TabularInline):
    model = PlayerGrowthLog
    extra = 0
    readonly_fields = (
        'period_name', 'old_overall', 'new_overall', 'change_amount',
        'change_type', 'avg_rating', 'games_played', 'goals_scored', 'created_at', 'notes'
    )
    can_delete = False


class PlayerLevelUpLogInline(admin.TabularInline):
    model = PlayerLevelUpLog
    extra = 0
    readonly_fields = (
        'old_level', 'new_level', 'xp_source', 'xp_amount', 'details', 'created_at'
    )
    can_delete = False


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'manager', 'budget')
    search_fields = ('name',)


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'team', 'base_team', 'position', 'compatible_positions', 'overall', 'level', 'xp',
        'is_injured', 'injury_matches',
        'stamina_status_display', 'is_starting'
    )
    list_filter = ('team', 'base_team', 'position', 'is_starting', 'is_injured', 'level')
    search_fields = ('name',)
    readonly_fields = ('stamina_status_display', 'is_stamina_locked_display')
    inlines = [PlayerGrowthLogInline, PlayerLevelUpLogInline]

    fieldsets = (
        ('اطلاعات پایه', {
            'fields': ('name', 'team', 'base_team', 'age', 'position', 'compatible_positions', 'overall')
        }),
        ('سیستم لول', {
            'fields': ('level', 'xp', 'total_xp')
        }),
        ('مصدومیت و غیبت', {
            'fields': ('is_injured', 'injury_matches', 'injury_return_date'),
            'description': 'ثبت مصدومیت در حین مسابقه توسط ادمین صورت می‌گیرد (۲ بازی غیبت).',
        }),
        ('موقعیت در ترکیب', {
            'fields': ('x_coord', 'y_coord', 'is_starting'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description="وضعیت سلامت")
    def stamina_status_display(self, obj):
        if obj.is_injured or (obj.injury_matches and obj.injury_matches > 0):
            return f"🚑 مصدوم ({obj.injury_matches} بازی)"
        return "🟢 آماده مسابقه"

    @admin.display(description="قفل شده؟", boolean=True)
    def is_stamina_locked_display(self, obj):
        return obj.is_stamina_locked


@admin.register(PlayerGrowthLog)
class PlayerGrowthLogAdmin(admin.ModelAdmin):
    list_display = (
        'player', 'period_name', 'old_overall', 'new_overall',
        'change_amount_display', 'avg_rating', 'games_played', 'goals_scored', 'created_at'
    )
    list_filter = ('change_type', 'period_name', 'created_at')
    search_fields = ('player__name', 'period_name')
    readonly_fields = [f.name for f in PlayerGrowthLog._meta.fields]

    @admin.display(description="تغییر اورال")
    def change_amount_display(self, obj):
        if obj.change_amount > 0:
            return f"🟢 +{obj.change_amount}"
        elif obj.change_amount < 0:
            return f"🔴 {obj.change_amount}"
        return "⚪ بدون تغییر"


@admin.register(PlayerLevelConfig)
class PlayerLevelConfigAdmin(admin.ModelAdmin):
    list_display = ('level', 'xp_required')
    ordering = ('level',)


@admin.register(PlayerLevelUpLog)
class PlayerLevelUpLogAdmin(admin.ModelAdmin):
    list_display = ('player', 'old_level', 'new_level', 'xp_source', 'xp_amount', 'created_at')
    list_filter = ('xp_source', 'created_at')
    search_fields = ('player__name',)
    readonly_fields = [f.name for f in PlayerLevelUpLog._meta.fields]
