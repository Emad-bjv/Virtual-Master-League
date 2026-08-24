from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count
from django.utils import timezone

import admin_api.serializers as s
import users.models as u_models
import economy.models as e_models
import core.models as c_models
import audit.models as a_models
import gacha.models as g_models
import matches.models as m_models
import notifications.models as n_models
import realtime.models as r_models
import season_pass.models as sp_models
import transfers.models as tr_models
import teams.models as t_models


class IsAdminUserOrRole(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and (
                user.is_staff or user.is_superuser or getattr(user, 'role', '') in ['admin', 'superadmin']
            )
        )


class AdminModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUserOrRole]


def create_admin_viewset(model_class, serializer_cls):
    class DynamicViewSet(AdminModelViewSet):
        pass
    DynamicViewSet.queryset = model_class.objects.all()
    DynamicViewSet.serializer_class = serializer_cls
    DynamicViewSet.__name__ = f"{model_class.__name__}AdminViewSet"
    return DynamicViewSet


UserAdminViewSet = create_admin_viewset(u_models.User, s.UserSerializer)

StorePackageAdminViewSet = create_admin_viewset(e_models.StorePackage, s.StorePackageSerializer)
TransactionAdminViewSet = create_admin_viewset(e_models.Transaction, s.TransactionSerializer)

GlobalSettingsAdminViewSet = create_admin_viewset(c_models.GlobalSettings, s.GlobalSettingsSerializer)
AdminAuditLogAdminViewSet = create_admin_viewset(a_models.AdminAuditLog, s.AdminAuditLogSerializer)

PackAdminViewSet = create_admin_viewset(g_models.Pack, s.PackSerializer)
PackPlayerAdminViewSet = create_admin_viewset(g_models.PackPlayer, s.PackPlayerSerializer)
PackOpeningSessionAdminViewSet = create_admin_viewset(g_models.PackOpeningSession, s.PackOpeningSessionSerializer)

SeasonAdminViewSet = create_admin_viewset(m_models.Season, s.SeasonSerializer)
TournamentAdminViewSet = create_admin_viewset(m_models.Tournament, s.TournamentSerializer)
MatchAdminViewSet = create_admin_viewset(m_models.Match, s.MatchSerializer)
MatchEventAdminViewSet = create_admin_viewset(m_models.MatchEvent, s.MatchEventSerializer)
PlayerMatchStatAdminViewSet = create_admin_viewset(m_models.PlayerMatchStat, s.PlayerMatchStatSerializer)
LiveSubstitutionRequestAdminViewSet = create_admin_viewset(m_models.LiveSubstitutionRequest, s.LiveSubstitutionRequestSerializer)
MatchTeamStatAdminViewSet = create_admin_viewset(m_models.MatchTeamStat, s.MatchTeamStatSerializer)
LeagueStandingAdminViewSet = create_admin_viewset(m_models.LeagueStanding, s.LeagueStandingSerializer)

NotificationAdminViewSet = create_admin_viewset(n_models.Notification, s.NotificationSerializer)
AdminNotificationAdminViewSet = create_admin_viewset(r_models.AdminNotification, s.AdminNotificationSerializer)

WeeklyTaskAdminViewSet = create_admin_viewset(sp_models.WeeklyTask, s.WeeklyTaskSerializer)
TeamTaskProgressAdminViewSet = create_admin_viewset(sp_models.TeamTaskProgress, s.TeamTaskProgressSerializer)
SeasonPassLevelAdminViewSet = create_admin_viewset(sp_models.SeasonPassLevel, s.SeasonPassLevelSerializer)
TeamSeasonPassAdminViewSet = create_admin_viewset(sp_models.TeamSeasonPass, s.TeamSeasonPassSerializer)

TransferListingAdminViewSet = create_admin_viewset(tr_models.TransferListing, s.TransferListingSerializer)
TransferBidAdminViewSet = create_admin_viewset(tr_models.TransferBid, s.TransferBidSerializer)
TransferHistoryAdminViewSet = create_admin_viewset(tr_models.TransferHistory, s.TransferHistorySerializer)

TeamAdminViewSet = create_admin_viewset(t_models.Team, s.TeamSerializer)
ClubFacilitiesAdminViewSet = create_admin_viewset(t_models.ClubFacilities, s.ClubFacilitiesSerializer)


class PlayerAdminViewSet(AdminModelViewSet):
    queryset = t_models.Player.objects.all().order_by('-overall', 'name')
    serializer_class = s.PlayerSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        team_id = self.request.query_params.get('team') or self.request.query_params.get('team_id')
        if team_id:
            qs = qs.filter(team_id=team_id)
        return qs


PlayerGrowthLogAdminViewSet = create_admin_viewset(t_models.PlayerGrowthLog, s.PlayerGrowthLogSerializer)
TeamGamePlanAdminViewSet = create_admin_viewset(t_models.TeamGamePlan, s.TeamGamePlanSerializer)


class AdminOverviewStatsView(APIView):
    """
    Returns authentic, real-time database aggregates and metrics for the Senior Admin Dashboard.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        now = timezone.now()

        # Users & Coaches Metrics
        total_users = u_models.User.objects.count()
        total_coaches = u_models.User.objects.filter(role='coach').count()
        total_admins = u_models.User.objects.filter(role='admin').count()

        # Teams & Players Metrics
        total_teams = t_models.Team.objects.count()
        total_players = t_models.Player.objects.count()
        avg_rating = t_models.Player.objects.aggregate(Avg('overall'))['overall__avg'] or 0

        # Financial Metrics
        financial_agg = t_models.Team.objects.aggregate(
            total_budget=Sum('budget'),
            total_wage_cap=Sum('wage_cap')
        )
        total_budget = financial_agg['total_budget'] or 0
        total_wage_cap = financial_agg['total_wage_cap'] or 0

        # Matches Status Breakdown
        total_matches = m_models.Match.objects.count()
        live_matches_count = m_models.Match.objects.filter(status='LIVE').count()
        scheduled_matches_count = m_models.Match.objects.filter(status='SCHEDULED').count()
        finished_matches_count = m_models.Match.objects.filter(status='FINISHED').count()

        # Active Tournament
        active_tourney = m_models.Tournament.objects.first()
        active_season = m_models.Season.objects.filter(is_active=True).first() or (active_tourney.season if active_tourney else None)

        # Standings Summary (Top 5)
        top_standings = []
        if active_tourney:
            standings_qs = m_models.LeagueStanding.objects.filter(tournament=active_tourney).select_related('team').order_by('-points', '-goals_for')[:5]
            for idx, st in enumerate(standings_qs, start=1):
                top_standings.append({
                    'rank': idx,
                    'team_id': st.team.id,
                    'team_name': st.team.name,
                    'played': st.played,
                    'won': st.won,
                    'drawn': st.drawn,
                    'lost': st.lost,
                    'points': st.points,
                    'goal_difference': st.goals_for - st.goals_against,
                })

        # Recent Live & Upcoming Match Items
        live_matches = []
        for m in m_models.Match.objects.filter(status='LIVE').select_related('home_team', 'away_team', 'tournament')[:3]:
            live_matches.append({
                'id': m.id,
                'home_team': m.home_team.name,
                'away_team': m.away_team.name,
                'home_score': m.home_score,
                'away_score': m.away_score,
                'half_status': m.half_status,
                'round_name': m.round_name,
            })

        upcoming_matches = []
        for m in m_models.Match.objects.filter(status='SCHEDULED').select_related('home_team', 'away_team').order_by('date', 'id')[:5]:
            upcoming_matches.append({
                'id': m.id,
                'home_team': m.home_team.name,
                'away_team': m.away_team.name,
                'date': m.date.isoformat() if m.date else None,
                'round_name': m.round_name,
            })

        finished_matches = []
        for m in m_models.Match.objects.filter(status='FINISHED').select_related('home_team', 'away_team').order_by('-id')[:5]:
            finished_matches.append({
                'id': m.id,
                'home_team': m.home_team.name,
                'away_team': m.away_team.name,
                'home_score': m.home_score,
                'away_score': m.away_score,
                'round_name': m.round_name,
            })

        # Transfer Market Summary
        active_transfers = tr_models.TransferListing.objects.filter(status='ACTIVE').count()
        total_bids = tr_models.TransferBid.objects.count()

        # Audit Logs Summary
        recent_audit = []
        for log in a_models.AdminAuditLog.objects.select_related('admin_user', 'target_team').order_by('-created_at')[:5]:
            team_name = log.target_team.name if log.target_team else ''
            recent_audit.append({
                'id': log.id,
                'action_type': log.action_type,
                'admin': log.admin_user.username if log.admin_user else 'سیستم',
                'team_name': team_name,
                'reason': log.reason,
                'created_at': log.created_at.isoformat(),
            })

        return Response({
            'status': 'ONLINE',
            'server_time': now.isoformat(),
            'overview': {
                'total_users': total_users,
                'total_coaches': total_coaches,
                'total_admins': total_admins,
                'total_teams': total_teams,
                'total_players': total_players,
                'avg_player_rating': round(float(avg_rating), 1),
                'total_budget': float(total_budget),
                'total_wage_cap': float(total_wage_cap),
                'active_transfers': active_transfers,
                'total_bids': total_bids,
            },
            'matches': {
                'total': total_matches,
                'live_count': live_matches_count,
                'scheduled_count': scheduled_matches_count,
                'finished_count': finished_matches_count,
                'live_matches': live_matches,
                'upcoming_matches': upcoming_matches,
                'recent_finished': finished_matches,
            },
            'tournament': {
                'id': active_tourney.id if active_tourney else None,
                'name': active_tourney.name if active_tourney else 'مستر لیگ مجازی',
                'season_name': active_season.name if active_season else 'فصل مرداد / شهریور',
                'top_standings': top_standings,
            },
            'recent_audit_logs': recent_audit,
        }, status=status.HTTP_200_OK)


class AdminFeatureFlagsView(APIView):
    """
    Endpoint for reading and updating all 9 system feature flags.
    Modifications require superadmin privileges and are logged to AdminAuditLog.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        settings = c_models.GlobalSettings.get_settings()
        from core.serializers import FeatureFlagsSerializer
        serializer = FeatureFlagsSerializer(settings)
        is_super = request.user.is_superuser or getattr(request.user, 'role', '') == 'superadmin'
        return Response({
            'flags': serializer.data,
            'can_edit': is_super
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        is_super = request.user.is_superuser or getattr(request.user, 'role', '') == 'superadmin'
        if not is_super:
            return Response(
                {'detail': 'تنها مدیر ارشد سامانه (SuperAdmin) مجاز به تغییر فلگ‌های سیستم است.'},
                status=status.HTTP_403_FORBIDDEN
            )

        settings = c_models.GlobalSettings.get_settings()
        from core.serializers import FeatureFlagsSerializer
        
        # Capture before state for audit log
        before_state = FeatureFlagsSerializer(settings).data
        serializer = FeatureFlagsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            after_state = serializer.data

            # Find changed keys
            changed_keys = [k for k in request.data if before_state.get(k) != after_state.get(k)]
            if changed_keys:
                a_models.AdminAuditLog.objects.create(
                    admin_user=request.user,
                    action_type='FEATURE_FLAGS_UPDATED',
                    before_value={k: before_state[k] for k in changed_keys},
                    after_value={k: after_state[k] for k in changed_keys},
                    reason=f"تغییر وضعیت فلگ‌های: {', '.join(changed_keys)}"
                )

            return Response({
                'flags': serializer.data,
                'can_edit': True,
                'message': 'فلگ‌های بخش‌های سیستم با موفقیت بروزرسانی شدند.'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminSystemSettingsView(APIView):
    """
    Endpoint for reading and updating all detailed settings (Economy, Market, Matches, Gacha, SeasonPass, Facilities).
    Modifications require superadmin privileges and are logged to AdminAuditLog.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        settings = c_models.GlobalSettings.get_settings()
        from core.serializers import GlobalSettingsSerializer
        serializer = GlobalSettingsSerializer(settings)
        is_super = request.user.is_superuser or getattr(request.user, 'role', '') == 'superadmin'
        return Response({
            'settings': serializer.data,
            'can_edit': is_super
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        is_super = request.user.is_superuser or getattr(request.user, 'role', '') == 'superadmin'
        if not is_super:
            return Response(
                {'detail': 'تنها مدیر ارشد سامانه (SuperAdmin) مجاز به ویرایش تنظیمات کلان سیستم است.'},
                status=status.HTTP_403_FORBIDDEN
            )

        settings = c_models.GlobalSettings.get_settings()
        from core.serializers import GlobalSettingsSerializer
        
        before_state = GlobalSettingsSerializer(settings).data
        serializer = GlobalSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            after_state = serializer.data

            changed_keys = [k for k in request.data if str(before_state.get(k)) != str(after_state.get(k))]
            if changed_keys:
                a_models.AdminAuditLog.objects.create(
                    admin_user=request.user,
                    action_type='SYSTEM_SETTINGS_UPDATED',
                    before_value={k: before_state.get(k) for k in changed_keys},
                    after_value={k: after_state.get(k) for k in changed_keys},
                    reason=f"بروزرسانی پارامترهای کلان: {', '.join(changed_keys)}"
                )

            return Response({
                'settings': serializer.data,
                'can_edit': True,
                'message': 'تنظیمات کلان سیستم با موفقیت ذخیره شدند.'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminResetActionView(APIView):
    """
    Endpoint for executing destructive reset operations with security confirmation string check.
    Requires superadmin privileges and mandatory confirmation 'ریست'.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def post(self, request, action=None):
        is_super = request.user.is_superuser or getattr(request.user, 'role', '') == 'superadmin'
        if not is_super:
            return Response(
                {'detail': 'تنها مدیر ارشد سامانه (SuperAdmin) مجاز به اجرای عملیات حساس ریست است.'},
                status=status.HTTP_403_FORBIDDEN
            )

        confirmation = str(request.data.get('confirmation', '')).strip()
        if confirmation != 'ریست':
            return Response(
                {'detail': 'عبارت تأیید نادرست است. برای اجرای عملیات باید عبارت «ریست» را تایپ کنید.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        target_action = action or request.data.get('action')
        from django.db import transaction

        try:
            with transaction.atomic():
                if target_action == 'reset-season':
                    standings_count = m_models.LeagueStanding.objects.count()
                    events_count = m_models.MatchEvent.objects.count()
                    stats_count = m_models.PlayerMatchStat.objects.count()
                    matches_count = m_models.Match.objects.count()

                    m_models.LeagueStanding.objects.all().delete()
                    m_models.MatchEvent.objects.all().delete()
                    m_models.PlayerMatchStat.objects.all().delete()
                    m_models.MatchTeamStat.objects.all().delete()
                    m_models.Match.objects.all().update(
                        status='SCHEDULED',
                        home_score=0,
                        away_score=0,
                        half_status='NOT_STARTED'
                    )
                    
                    settings = c_models.GlobalSettings.get_settings()
                    settings.current_week = 1
                    settings.save(update_fields=['current_week'])

                    a_models.AdminAuditLog.objects.create(
                        admin_user=request.user,
                        action_type='RESET_SEASON',
                        before_value={'standings': standings_count, 'events': events_count, 'stats': stats_count},
                        after_value={'standings': 0, 'events': 0, 'stats': 0, 'matches_reset': matches_count},
                        reason='ریست کامل فصل، رده‌بندی‌ها، رویدادها و آمار مسابقات'
                    )
                    return Response({
                        'success': True,
                        'message': f'فصل با موفقیت ریست شد. {matches_count} مسابقه به حالت اولیه بازگشتند و رده‌بندی‌ها پاک شدند.'
                    })

                elif target_action == 'reset-budgets':
                    settings = c_models.GlobalSettings.get_settings()
                    default_budget = settings.default_team_budget
                    default_wage = settings.default_wage_cap
                    teams_count = t_models.Team.objects.count()

                    t_models.Team.objects.all().update(
                        budget=default_budget,
                        wage_cap=default_wage
                    )

                    a_models.AdminAuditLog.objects.create(
                        admin_user=request.user,
                        action_type='RESET_BUDGETS',
                        before_value={'teams_affected': teams_count},
                        after_value={'default_budget': float(default_budget), 'default_wage': float(default_wage)},
                        reason=f'ریست بودجه و سقف دستمزد تمامی {teams_count} تیم به مقدار پیش‌فرض'
                    )
                    return Response({
                        'success': True,
                        'message': f'بودجه تمامی {teams_count} باشگاه به مقدار پیش‌فرض ({float(default_budget):,.0f} دلار) بازگردانده شد.'
                    })

                elif target_action == 'reset-player-stats':
                    deleted_stats = m_models.PlayerMatchStat.objects.count()
                    m_models.PlayerMatchStat.objects.all().delete()
                    players_count = t_models.Player.objects.count()
                    t_models.Player.objects.all().update(
                        yellow_card_accumulator=0,
                        suspension_matches=0,
                        consecutive_games=0,
                        matches_benched_streak=0
                    )

                    a_models.AdminAuditLog.objects.create(
                        admin_user=request.user,
                        action_type='RESET_PLAYER_STATS',
                        before_value={'stats_records': deleted_stats},
                        after_value={'stats_records': 0, 'players_reset': players_count},
                        reason='ریست آمار عملکردی، کارت‌های زرد و محرومیت‌های بازیکنان'
                    )
                    return Response({
                        'success': True,
                        'message': f'آمار مسابقات، کارت‌ها و محرومیت‌های تمامی {players_count} بازیکن با موفقیت صفر شد.'
                    })

                elif target_action == 'reset-transfers':
                    active_listings = tr_models.TransferListing.objects.filter(status='ACTIVE').count()
                    tr_models.TransferListing.objects.filter(status='ACTIVE').update(status='CANCELLED')
                    deleted_bids = tr_models.TransferBid.objects.count()
                    tr_models.TransferBid.objects.all().delete()

                    a_models.AdminAuditLog.objects.create(
                        admin_user=request.user,
                        action_type='RESET_TRANSFERS',
                        before_value={'active_listings': active_listings, 'bids': deleted_bids},
                        after_value={'active_listings': 0, 'bids': 0},
                        reason='ریست بازار نقل و انتقالات و پاکسازی پیشنهادات'
                    )
                    return Response({
                        'success': True,
                        'message': f'تمام {active_listings} لیستینگ فعال لغو و {deleted_bids} پیشنهاد قیمت حذف شدند.'
                    })

                elif target_action == 'reset-season-pass':
                    passes_count = sp_models.TeamSeasonPass.objects.count()
                    sp_models.TeamSeasonPass.objects.all().update(
                        current_xp=0,
                        current_level=1,
                        claimed_levels=[],
                        legend_claimed=False
                    )
                    sp_models.TeamTaskProgress.objects.all().update(
                        current_value=0,
                        is_completed=False,
                        is_claimed=False
                    )

                    a_models.AdminAuditLog.objects.create(
                        admin_user=request.user,
                        action_type='RESET_SEASON_PASS',
                        before_value={'passes_affected': passes_count},
                        after_value={'current_level': 1, 'current_xp': 0},
                        reason='ریست پیشرفت سیزن پس و تسک‌های هفتگی تیم‌ها'
                    )
                    return Response({
                        'success': True,
                        'message': f'پیشرفت سیزن پس و تسک‌های تمامی {passes_count} تیم با موفقیت ریست شد.'
                    })

                elif target_action == 'reset-facilities':
                    facilities_count = t_models.ClubFacilities.objects.count()
                    t_models.ClubFacilities.objects.all().update(
                        training_camp_level=0,
                        gym_level=0,
                        medical_level=0,
                        pool_level=0,
                        stadium_level=0,
                        academy_level=0
                    )

                    a_models.AdminAuditLog.objects.create(
                        admin_user=request.user,
                        action_type='RESET_FACILITIES',
                        before_value={'facilities_count': facilities_count},
                        after_value={'all_levels': 0},
                        reason='ریست سطح تمام تسهیلات و امکانات باشگاه‌ها به صفر'
                    )
                    return Response({
                        'success': True,
                        'message': f'سطح تمامی ۶ بخش تسهیلات در {facilities_count} باشگاه به صفر بازگردانده شد.'
                    })

                elif target_action == 'clear-audit-logs':
                    logs_count = a_models.AdminAuditLog.objects.count()
                    a_models.AdminAuditLog.objects.all().delete()
                    return Response({
                        'success': True,
                        'message': f'تمامی {logs_count} لاگ حسابرسی سامانه با موفقیت پاکسازی شدند.'
                    })

                elif target_action == 'clear-notifications':
                    notifs_count = n_models.Notification.objects.count()
                    admin_notifs_count = r_models.AdminNotification.objects.count()
                    n_models.Notification.objects.all().delete()
                    r_models.AdminNotification.objects.all().delete()

                    a_models.AdminAuditLog.objects.create(
                        admin_user=request.user,
                        action_type='CLEAR_NOTIFICATIONS',
                        before_value={'notifications': notifs_count, 'admin_notifications': admin_notifs_count},
                        after_value={'total': 0},
                        reason='پاکسازی تمامی نوتیفیکیشن‌ها و اعلان‌های سیستم'
                    )
                    return Response({
                        'success': True,
                        'message': f'تمامی {notifs_count + admin_notifs_count} اعلان با موفقیت حذف شدند.'
                    })

                else:
                    return Response(
                        {'detail': f'عملیات ناشناخته: {target_action}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        except Exception as e:
            return Response(
                {'detail': f'خطا در اجرای عملیات ریست: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

