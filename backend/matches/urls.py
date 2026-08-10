from django.urls import path
from .views import (
    LiveSubstitutionCreateView,
    UpcomingMatchesView,
    MatchHistoryView,
    LeagueStandingsView,
    MatchEventCreateView,
    ApplySubstitutionView,
    MatchStatusUpdateView,
    # Task C new views
    TournamentStandingListView,
    SubmitTeamStatsView,
    SubmitPlayerRatingsView,
    MatchDetailView,
    TeamMatchHistoryView,
    AdminMatchListView,
    AdminMatchCreateView,
    AdminMatchUpdateView,
)

urlpatterns = [
    # Existing endpoints
    path('matches/substitute/', LiveSubstitutionCreateView.as_view(), name='live-substitute'),
    path('matches/upcoming/', UpcomingMatchesView.as_view(), name='matches-upcoming'),
    path('matches/history/', MatchHistoryView.as_view(), name='matches-history'),
    path('matches/standings/', LeagueStandingsView.as_view(), name='matches-standings'),
    path('matches/<int:match_id>/event/', MatchEventCreateView.as_view(), name='match-event'),
    path('matches/<int:match_id>/substitute/', ApplySubstitutionView.as_view(), name='match-substitute'),
    path('matches/<int:match_id>/status/', MatchStatusUpdateView.as_view(), name='match-status'),

    # Task C: Standings (persisted per tournament)
    path('tournaments/<int:tournament_id>/standings/', TournamentStandingListView.as_view(), name='tournament-standings'),

    # Task C: Match stats & ratings (admin POST)
    path('matches/<int:match_id>/team-stats/', SubmitTeamStatsView.as_view(), name='match-team-stats'),
    path('matches/<int:match_id>/player-ratings/', SubmitPlayerRatingsView.as_view(), name='match-player-ratings'),

    # Task C: Match detail & team history
    path('matches/<int:match_id>/detail/', MatchDetailView.as_view(), name='match-detail'),
    path('teams/<int:team_id>/match-history/', TeamMatchHistoryView.as_view(), name='team-match-history'),

    # Admin Match Management Endpoints
    path('matches/admin-list/', AdminMatchListView.as_view(), name='admin-match-list'),
    path('matches/admin-create/', AdminMatchCreateView.as_view(), name='admin-match-create'),
    path('matches/<int:match_id>/admin-update/', AdminMatchUpdateView.as_view(), name='admin-match-update'),
]
