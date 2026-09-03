from django.contrib import admin, messages
from django.utils import timezone
from .models import Match, MatchEvent, PlayerMatchStat, Tournament, LiveSubstitutionRequest, Season, MatchTeamStat, LeagueStanding


class MatchEventInline(admin.TabularInline):
    model = MatchEvent
    extra = 1


class PlayerMatchStatInline(admin.TabularInline):
    model = PlayerMatchStat
    extra = 0
    fields = ('player', 'was_starter', 'minutes_played', 'rating')


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'started_at', 'ended_at')
    list_filter = ('is_active',)
    actions = ['close_season_and_graduate']

    @admin.action(description="بستن فصل و اجرای فارغ‌التحصیلی آکادمی")
    def close_season_and_graduate(self, request, queryset):
        """
        Admin action: Closes selected seasons and triggers academy graduation.
        Called when a season ends — sets is_active=False and fires the graduation task.
        """
        from teams.tasks import task_run_academy_graduation

        closed_count = 0
        for season in queryset:
            if not season.is_active:
                messages.warning(request, f"فصل '{season.name}' قبلاً بسته شده است.")
                continue

            from django.utils import timezone as tz
            season.is_active = False
            season.ended_at = tz.now()
            season.save(update_fields=['is_active', 'ended_at'])

            # Trigger academy graduation asynchronously
            task_run_academy_graduation.delay()

            messages.success(
                request,
                f"فصل '{season.name}' بسته شد. فارغ‌التحصیلی آکادمی در حال اجراست."
            )
            closed_count += 1

        if closed_count > 0:
            messages.info(request, f"در مجموع {closed_count} فصل بسته شد و تسک فارغ‌التحصیلی آكادمی فعال شد.")


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('name', 'tournament_type', 'season', 'is_active', 'created_at')
    list_filter = ('tournament_type', 'season', 'is_active')
    search_fields = ('name',)
    actions = ['action_generate_fixtures']

    @admin.action(description="تولید برنامه بازی‌ها (فقط برای تورنمنت‌های لیگ)")
    def action_generate_fixtures(self, request, queryset):
        from .fixture_engine import generate_league_fixtures
        
        for tournament in queryset:
            if tournament.tournament_type != 'LEAGUE':
                messages.error(request, f"تورنمنت {tournament.name} از نوع لیگ نیست و فیکسچر آن تولید نمی‌شود.")
                continue
                
            from teams.models import Team
            teams = Team.objects.all() # Or filter based on league if needed. For now, all teams in the system.
            if teams.count() < 2:
                messages.error(request, "حداقل دو تیم برای تشکیل لیگ نیاز است.")
                continue
                
            start_date = timezone.now() # Could also ask for a specific date, but using now for simplicity
            match_count = generate_league_fixtures(tournament, teams, start_date)
            if match_count > 0:
                messages.success(request, f"فیکسچر برای تورنمنت {tournament.name} تولید شد ({match_count} بازی).")
            else:
                messages.warning(request, f"خطا در تولید فیکسچر برای تورنمنت {tournament.name}.")


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = (
        'tournament', 'round_name', 'home_team', 'home_score', 
        'away_score', 'away_team', 'status', 'is_knockout'
    )
    list_filter = ('status', 'tournament', 'is_knockout', 'fatigue_applied')
    inlines = [MatchEventInline, PlayerMatchStatInline]
    actions = ['action_run_growth_evaluation', 'action_advance_winners']
    
    fieldsets = (
        ('اطلاعات پایه مسابقه', {
            'fields': ('tournament', 'round_name', 'is_knockout', 'date', 'status', 'stream_url')
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
        messages.info(request, "سیستم خستگی به طور کامل از پروژه غیرفعال شده است.")

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


@admin.register(MatchTeamStat)
class MatchTeamStatAdmin(admin.ModelAdmin):
    list_display = ('match', 'team', 'possession_percent', 'shots', 'shots_on_target', 'corners', 'fouls', 'offsides')
    list_filter = ('match__tournament',)
    search_fields = ('team__name',)


@admin.register(LeagueStanding)
class LeagueStandingAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'team', 'played', 'won', 'drawn', 'lost', 'goals_for', 'goals_against', 'points')
    list_filter = ('tournament',)
    search_fields = ('team__name', 'tournament__name')
    ordering = ('tournament', '-points')
