from django.contrib import admin, messages
from .models import Match, MatchEvent, PlayerMatchStat, Tournament, LiveSubstitutionRequest


class MatchEventInline(admin.TabularInline):
    model = MatchEvent
    extra = 1


class PlayerMatchStatInline(admin.TabularInline):
    model = PlayerMatchStat
    extra = 0
    fields = ('player', 'was_starter', 'minutes_played', 'rating')


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('name', 'tournament_type', 'is_active', 'created_at')
    list_filter = ('tournament_type', 'is_active')
    search_fields = ('name',)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = (
        'tournament', 'round_name', 'home_team', 'home_score', 
        'away_score', 'away_team', 'status', 'is_knockout'
    )
    list_filter = ('status', 'tournament', 'is_knockout', 'fatigue_applied')
    inlines = [MatchEventInline, PlayerMatchStatInline]
    actions = ['action_apply_fatigue', 'action_run_growth_evaluation', 'action_advance_winners']
    
    fieldsets = (
        ('اطلاعات پایه مسابقه', {
            'fields': ('tournament', 'round_name', 'is_knockout', 'date', 'status', 'fatigue_applied')
        }),
        ('تیم‌ها و نتیجه', {
            'fields': ('home_team', 'away_team', 'home_score', 'away_score')
        }),
        ('ضربات پنالتی (جام حذفی)', {
            'fields': ('home_penalties', 'away_penalties', 'next_match'),
            'classes': ('collapse',),
            'description': 'فقط در صورتی که مسابقه حذفی در وقت قانونی مساوی شود.'
        }),
    )

    @admin.action(description="صعود برنده‌ها به مرحله بعد (جام حذفی)")
    def action_advance_winners(self, request, queryset):
        from .cup_engine import advance_winner
        
        processed = 0
        errors = 0
        
        for match in queryset:
            result = advance_winner(match)
            if result['success']:
                processed += 1
                if 'winner' in result:
                     messages.success(request, f"تیم {result['winner']} به مرحله بعد صعود کرد.")
            else:
                errors += 1
                messages.error(request, f"خطا در بازی {match}: {result['error']}")
                
        if processed:
            messages.success(request, f"{processed} عملیات صعود با موفقیت انجام شد.")

    @admin.action(description="اعمال خستگی روی بازیکنان بازی‌های انتخاب‌شده")
    def action_apply_fatigue(self, request, queryset):
        """
        Admin action: Apply fatigue to all players in selected FINISHED matches.
        """
        from teams.stamina_engine import apply_fatigue

        processed = 0
        skipped = 0

        for match in queryset:
            if match.status != 'FINISHED':
                skipped += 1
                continue
            if match.fatigue_applied:
                skipped += 1
                continue

            stats = PlayerMatchStat.objects.filter(match=match).select_related('player')

            if not stats.exists():
                messages.warning(
                    request,
                    f"بازی {match} آمار بازیکنان (PlayerMatchStat) ندارد. ابتدا آمار را ثبت کنید."
                )
                skipped += 1
                continue

            for stat in stats:
                if stat.minutes_played > 0:
                    apply_fatigue(stat.player, stat.minutes_played)

            match.fatigue_applied = True
            match.save(update_fields=['fatigue_applied'])
            processed += 1

        if processed:
            messages.success(request, f"خستگی برای {processed} بازی اعمال شد.")
        if skipped:
            messages.warning(request, f"{skipped} بازی رد شد (هنوز پایان نیافته یا قبلاً اعمال شده).")

    @admin.action(description="اجرای ارزیابی رشد/افت بازیکنان برای بازی‌های انتخاب‌شده")
    def action_run_growth_evaluation(self, request, queryset):
        """
        Admin action: Run growth & decline evaluation for selected matches.
        """
        from teams.growth_engine import run_evaluation_cycle

        finished_matches = queryset.filter(status='FINISHED')
        match_ids = list(finished_matches.values_list('id', flat=True))

        if not match_ids:
            messages.error(request, "هیچ بازی پایان‌یافته‌ای انتخاب نشده است.")
            return

        period_name = f"ارزیابی دستی ادمین ({len(match_ids)} بازی)"
        result = run_evaluation_cycle(match_ids=match_ids, period_name=period_name)

        messages.success(
            request,
            f"ارزیابی عملکرد انجام شد: {result['upgrades_count']} ارتقا (رشد)، "
            f"{result['downgrades_count']} افت، {result['skipped_count']} بازیکن بدون حداقل بازی."
        )


@admin.register(MatchEvent)
class MatchEventAdmin(admin.ModelAdmin):
    list_display = ('match', 'player', 'event_type', 'minute')
    list_filter = ('event_type', 'match')


@admin.register(PlayerMatchStat)
class PlayerMatchStatAdmin(admin.ModelAdmin):
    list_display = ('match', 'player', 'was_starter', 'minutes_played', 'rating')
    list_filter = ('match', 'was_starter')


@admin.register(LiveSubstitutionRequest)
class LiveSubstitutionRequestAdmin(admin.ModelAdmin):
    list_display = ('match', 'team', 'player_out', 'player_in', 'minute', 'status', 'created_at')
    list_filter = ('status', 'match', 'team')
    actions = ['action_mark_applied', 'action_mark_rejected']

    @admin.action(description="ثبت تعویض‌ها به عنوان 'اعمال شده در بازی'")
    def action_mark_applied(self, request, queryset):
        updated = queryset.update(status='APPLIED')
        messages.success(request, f"{updated} درخواست تعویض به عنوان اعمال شده ثبت شد.")

    @admin.action(description="رد کردن درخواست‌های تعویض")
    def action_mark_rejected(self, request, queryset):
        updated = queryset.update(status='REJECTED')
        messages.success(request, f"{updated} درخواست تعویض رد شد.")
