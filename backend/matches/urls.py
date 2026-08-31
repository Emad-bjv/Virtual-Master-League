from django.urls import path
from .views import (
    LiveSubstitutionCreateView,
    UpcomingMatchesView,
    MatchHistoryView,
    LeagueStandingsView,
    MatchEventCreateView,
    ApplySubstitutionView,
    MatchStatusUpdateView,
    LiveMatchTacticsUpdateView,
    # Task C new views
    TournamentStandingListView,
    SubmitTeamStatsView,
    SubmitPlayerRatingsView,
    MatchDetailView,
    TeamMatchHistoryView,
    AdminMatchListView,
    AdminMatchCreateView,
    AdminMatchUpdateView,
    TeamScheduleView,
    GenerateLeagueFixturesView,
    ActiveLiveMatchContextView,
    MatchLiveStateView,
    AdminMatchControlRoomView,
    GameweekStatusView,
    LiveInGameChangeBatchSubmitView,
    LiveInGameChangeListView,
    LiveInGameChangeApplyView,
    LiveInGameChangeRejectView,
    # Tournament & Cup Management Views
    AdminLeagueConfigureView,
    AdminLeagueResetView,
    AdminGameweekActionView,
    AdminCupTournamentView,
    AdminCupResetView,
    AdminCupBracketView,
    AdminSyncCupLeagueView,
    AdminMatchForfeitView,
    AdminStandingsManualEditView,
    AdminStandingsApplyPenaltyView,
    AdminStandingsRecalculateView,
)

urlpatterns = [
    # Live Match Real-Time & Time-Gating Context
    path('matches/gameweeks-status/', GameweekStatusView.as_view(), name='gameweeks-status'),
    path('matches/live-context/', ActiveLiveMatchContextView.as_view(), name='active-live-context'),
    path('matches/<int:match_id>/live-state/', MatchLiveStateView.as_view(), name='match-live-state'),
    path('matches/<int:match_id>/control/', AdminMatchControlRoomView.as_view(), name='admin-match-control'),
    # Existing endpoints
    path('matches/substitute/', LiveSubstitutionCreateView.as_view(), name='live-substitute'),
    path('matches/upcoming/', UpcomingMatchesView.as_view(), name='matches-upcoming'),
    path('matches/history/', MatchHistoryView.as_view(), name='matches-history'),
    path('matches/standings/', LeagueStandingsView.as_view(), name='matches-standings'),
    path('matches/schedule/', TeamScheduleView.as_view(), name='league-schedule'),
    path('matches/generate-fixtures/', GenerateLeagueFixturesView.as_view(), name='generate-fixtures'),
    path('matches/<int:match_id>/event/', MatchEventCreateView.as_view(), name='match-event'),
    path('matches/<int:match_id>/substitute/', ApplySubstitutionView.as_view(), name='match-substitute'),
    path('matches/<int:match_id>/status/', MatchStatusUpdateView.as_view(), name='match-status'),
    path('matches/live-tactics-update/', LiveMatchTacticsUpdateView.as_view(), name='live-tactics-update'),

    # Task C: Standings (persisted per tournament)
    path('tournaments/<int:tournament_id>/standings/', TournamentStandingListView.as_view(), name='tournament-standings'),

    # Task C: Match stats & ratings (admin POST)
    path('matches/<int:match_id>/team-stats/', SubmitTeamStatsView.as_view(), name='match-team-stats'),
    path('matches/<int:match_id>/stats/team/', SubmitTeamStatsView.as_view(), name='match-stats-team'),
    path('matches/<int:match_id>/player-ratings/', SubmitPlayerRatingsView.as_view(), name='match-player-ratings'),
    path('matches/<int:match_id>/stats/players/', SubmitPlayerRatingsView.as_view(), name='match-stats-players'),

    # Task C: Match detail & team history
    path('matches/<int:match_id>/detail/', MatchDetailView.as_view(), name='match-detail'),
    path('teams/<int:team_id>/match-history/', TeamMatchHistoryView.as_view(), name='team-match-history'),
    path('teams/<int:team_id>/schedule/', TeamScheduleView.as_view(), name='team-schedule'),

    # Admin Match Management Endpoints
    path('matches/admin-list/', AdminMatchListView.as_view(), name='admin-match-list'),
    path('matches/admin-create/', AdminMatchCreateView.as_view(), name='admin-match-create'),
    path('matches/<int:match_id>/admin-update/', AdminMatchUpdateView.as_view(), name='admin-match-update'),

    # In-Game Changes Management (Coach Submissions & Referee Check-Offs)
    path('matches/<int:match_id>/in-game-changes/', LiveInGameChangeBatchSubmitView.as_view(), name='match-in-game-changes-submit'),
    path('matches/<int:match_id>/in-game-changes/list/', LiveInGameChangeListView.as_view(), name='match-in-game-changes-list'),
    path('matches/<int:match_id>/in-game-changes/<int:change_id>/apply/', LiveInGameChangeApplyView.as_view(), name='match-in-game-change-apply'),
    path('matches/<int:match_id>/in-game-changes/<int:change_id>/reject/', LiveInGameChangeRejectView.as_view(), name='match-in-game-change-reject'),

    # League & Cup Tournament Admin Hub Endpoints
    path('matches/admin/league/configure/', AdminLeagueConfigureView.as_view(), name='admin-league-configure'),
    path('matches/admin/league/reset/', AdminLeagueResetView.as_view(), name='admin-league-reset'),
    path('matches/admin/gameweek-action/', AdminGameweekActionView.as_view(), name='admin-gameweek-action'),
    path('matches/admin/cups/', AdminCupTournamentView.as_view(), name='admin-cups'),
    path('matches/admin/cups/reset/', AdminCupResetView.as_view(), name='admin-cup-reset'),
    path('matches/admin/cups/<int:cup_id>/', AdminCupTournamentView.as_view(), name='admin-cup-detail'),
    path('matches/admin/cups/<int:tournament_id>/bracket/', AdminCupBracketView.as_view(), name='admin-cup-bracket'),
    path('matches/admin/cups/<int:match_id>/advance/', AdminCupBracketView.as_view(), name='admin-cup-advance'),
    path('matches/admin/sync-cup-league/', AdminSyncCupLeagueView.as_view(), name='admin-sync-cup-league'),
    path('matches/<int:match_id>/forfeit/', AdminMatchForfeitView.as_view(), name='admin-match-forfeit'),
    path('matches/admin/standings/manual-edit/', AdminStandingsManualEditView.as_view(), name='admin-standings-manual-edit'),
    path('matches/admin/standings/apply-penalty/', AdminStandingsApplyPenaltyView.as_view(), name='admin-standings-apply-penalty'),
    path('matches/admin/standings/recalculate/', AdminStandingsRecalculateView.as_view(), name='admin-standings-recalculate'),
]

