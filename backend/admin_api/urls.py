from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

router.register(r'users', views.UserAdminViewSet, basename='admin-users')

router.register(r'store-packages', views.StorePackageAdminViewSet, basename='admin-storepackages')
router.register(r'transactions', views.TransactionAdminViewSet, basename='admin-transactions')

router.register(r'global-settings', views.GlobalSettingsAdminViewSet, basename='admin-globalsettings')
router.register(r'audit-logs', views.AdminAuditLogAdminViewSet, basename='admin-auditlogs')

router.register(r'packs', views.PackAdminViewSet, basename='admin-packs')
router.register(r'pack-players', views.PackPlayerAdminViewSet, basename='admin-packplayers')
router.register(r'pack-opening-sessions', views.PackOpeningSessionAdminViewSet, basename='admin-packopeningsessions')

router.register(r'seasons', views.SeasonAdminViewSet, basename='admin-seasons')
router.register(r'tournaments', views.TournamentAdminViewSet, basename='admin-tournaments')
router.register(r'matches', views.MatchAdminViewSet, basename='admin-matches')
router.register(r'match-events', views.MatchEventAdminViewSet, basename='admin-matchevents')
router.register(r'player-match-stats', views.PlayerMatchStatAdminViewSet, basename='admin-playermatchstats')
router.register(r'live-substitution-requests', views.LiveSubstitutionRequestAdminViewSet, basename='admin-livesubstitutionrequests')
router.register(r'match-team-stats', views.MatchTeamStatAdminViewSet, basename='admin-matchteamstats')
router.register(r'league-standings', views.LeagueStandingAdminViewSet, basename='admin-leaguestandings')

router.register(r'notifications', views.NotificationAdminViewSet, basename='admin-notifications')
router.register(r'admin-notifications', views.AdminNotificationAdminViewSet, basename='admin-adminnotifications')

router.register(r'weekly-tasks', views.WeeklyTaskAdminViewSet, basename='admin-weeklytasks')
router.register(r'team-task-progress', views.TeamTaskProgressAdminViewSet, basename='admin-teamtaskprogress')
router.register(r'season-pass-levels', views.SeasonPassLevelAdminViewSet, basename='admin-seasonpasslevels')
router.register(r'team-season-passes', views.TeamSeasonPassAdminViewSet, basename='admin-teamseasonpasses')

router.register(r'transfer-listings', views.TransferListingAdminViewSet, basename='admin-transferlistings')
router.register(r'transfer-bids', views.TransferBidAdminViewSet, basename='admin-transferbids')
router.register(r'transfer-histories', views.TransferHistoryAdminViewSet, basename='admin-transferhistories')

router.register(r'teams', views.TeamAdminViewSet, basename='admin-teams')
router.register(r'club-facilities', views.ClubFacilitiesAdminViewSet, basename='admin-clubfacilities')
router.register(r'players', views.PlayerAdminViewSet, basename='admin-players')
router.register(r'player-growth-logs', views.PlayerGrowthLogAdminViewSet, basename='admin-playergrowthlogs')
router.register(r'team-game-plans', views.TeamGamePlanAdminViewSet, basename='admin-teamgameplans')

urlpatterns = [
    path('overview-stats/', views.AdminOverviewStatsView.as_view(), name='admin-overview-stats'),
    path('feature-flags/', views.AdminFeatureFlagsView.as_view(), name='admin-feature-flags'),
    path('system-settings/', views.AdminSystemSettingsView.as_view(), name='admin-system-settings'),
    path('reset/<str:action>/', views.AdminResetActionView.as_view(), name='admin-reset-action-slug'),
    path('reset/', views.AdminResetActionView.as_view(), name='admin-reset-action'),
    path('', include(router.urls)),
]

