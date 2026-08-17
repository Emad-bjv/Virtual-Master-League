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


class AdminModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]


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

GachaPackAdminViewSet = create_admin_viewset(g_models.GachaPack, s.GachaPackSerializer)
GachaPityAdminViewSet = create_admin_viewset(g_models.GachaPity, s.GachaPitySerializer)
PackOpeningLogAdminViewSet = create_admin_viewset(g_models.PackOpeningLog, s.PackOpeningLogSerializer)

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
PlayerAdminViewSet = create_admin_viewset(t_models.Player, s.PlayerSerializer)
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
        for log in a_models.AdminAuditLog.objects.select_related('admin_user').order_by('-created_at')[:5]:
            recent_audit.append({
                'id': log.id,
                'action_type': log.action_type,
                'admin': log.admin_user.username if log.admin_user else 'سیستم',
                'team_name': log.team_name,
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
