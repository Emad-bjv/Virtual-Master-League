from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeamViewSet, PlayerViewSet, PositionChoicesView,
    AdminPESTransfersOverviewView, AdminPESTransferClubDetailView, AdminPESTransferToggleView,
    AdminDisciplinaryOverviewView, AdminDisciplinaryRecordsView,
    AdminDisciplinaryIssueView, AdminDisciplinaryRevokeView, TeamPenaltiesView
)

router = DefaultRouter()
router.register(r'teams', TeamViewSet)
router.register(r'players', PlayerViewSet)

urlpatterns = [
    path('positions/', PositionChoicesView.as_view(), name='position-choices'),
    # PES Transfer Hub Endpoints
    path('teams/admin/pes-transfers/overview/', AdminPESTransfersOverviewView.as_view(), name='admin-pes-transfers-overview'),
    path('teams/admin/pes-transfers/club/<int:team_id>/', AdminPESTransferClubDetailView.as_view(), name='admin-pes-transfers-club-detail'),
    path('teams/admin/pes-transfers/toggle-applied/', AdminPESTransferToggleView.as_view(), name='admin-pes-transfers-toggle-applied'),
    path('admin/pes-transfers/overview/', AdminPESTransfersOverviewView.as_view()),
    path('admin/pes-transfers/club/<int:team_id>/', AdminPESTransferClubDetailView.as_view()),
    path('admin/pes-transfers/toggle-applied/', AdminPESTransferToggleView.as_view()),

    # Disciplinary Committee Endpoints
    path('teams/admin/disciplinary/overview/', AdminDisciplinaryOverviewView.as_view(), name='admin-disciplinary-overview'),
    path('teams/admin/disciplinary/records/', AdminDisciplinaryRecordsView.as_view(), name='admin-disciplinary-records'),
    path('teams/admin/disciplinary/issue/', AdminDisciplinaryIssueView.as_view(), name='admin-disciplinary-issue'),
    path('teams/admin/disciplinary/<int:penalty_id>/revoke/', AdminDisciplinaryRevokeView.as_view(), name='admin-disciplinary-revoke'),
    path('teams/<int:team_id>/penalties/', TeamPenaltiesView.as_view(), name='team-penalties'),
    path('teams/my-penalties/', TeamPenaltiesView.as_view(), name='my-penalties'),

    path('admin/disciplinary/overview/', AdminDisciplinaryOverviewView.as_view()),
    path('admin/disciplinary/records/', AdminDisciplinaryRecordsView.as_view()),
    path('admin/disciplinary/issue/', AdminDisciplinaryIssueView.as_view()),
    path('admin/disciplinary/<int:penalty_id>/revoke/', AdminDisciplinaryRevokeView.as_view()),

    path('', include(router.urls)),
]

