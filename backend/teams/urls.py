from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TeamViewSet, PlayerViewSet, PositionChoicesView,
    AdminPESTransfersOverviewView, AdminPESTransferClubDetailView, AdminPESTransferToggleView
)

router = DefaultRouter()
router.register(r'teams', TeamViewSet)
router.register(r'players', PlayerViewSet)

urlpatterns = [
    path('positions/', PositionChoicesView.as_view(), name='position-choices'),
    # PES Transfer Hub Endpoints
    path('admin/pes-transfers/overview/', AdminPESTransfersOverviewView.as_view(), name='admin-pes-transfers-overview'),
    path('admin/pes-transfers/club/<int:team_id>/', AdminPESTransferClubDetailView.as_view(), name='admin-pes-transfers-club-detail'),
    path('admin/pes-transfers/toggle-applied/', AdminPESTransferToggleView.as_view(), name='admin-pes-transfers-toggle-applied'),
    path('', include(router.urls)),
]

