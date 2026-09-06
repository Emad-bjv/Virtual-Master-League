from django.urls import path
from .views import (
    PackListView,
    OpenPackView,
    PickCardView,
    ExpireSessionView,
    AdminPackListView,
    AdminPackDetailView,
    AdminPackPlayersView,
    AdminPackPlayersBulkView,
    AdminPackPlayerDetailView,
    AdminPackPlayerReturnView,
    AdminPackPlayersReturnAllView,
    AdminPackSessionsView
)

urlpatterns = [
    # User pack endpoints
    path('gacha/packs/', PackListView.as_view(), name='pack-list'),
    path('gacha/open/', OpenPackView.as_view(), name='pack-open'),
    path('gacha/pick/', PickCardView.as_view(), name='pack-pick'),
    path('gacha/expire-session/', ExpireSessionView.as_view(), name='pack-expire-session'),

    # Direct pack endpoints aliases
    path('packs/', PackListView.as_view(), name='pack-list-direct'),
    path('packs/open/', OpenPackView.as_view(), name='pack-open-direct'),
    path('packs/pick/', PickCardView.as_view(), name='pack-pick-direct'),
    path('packs/expire-session/', ExpireSessionView.as_view(), name='pack-expire-session-direct'),

    # Admin pack management endpoints
    path('gacha/admin/packs/', AdminPackListView.as_view(), name='admin-pack-list'),
    path('gacha/admin/packs/<int:pk>/', AdminPackDetailView.as_view(), name='admin-pack-detail'),
    path('gacha/admin/packs/<int:pack_id>/players/', AdminPackPlayersView.as_view(), name='admin-pack-players'),
    path('gacha/admin/packs/<int:pack_id>/players/bulk/', AdminPackPlayersBulkView.as_view(), name='admin-pack-players-bulk'),
    path('gacha/admin/packs/<int:pack_id>/players/<int:player_id>/', AdminPackPlayerDetailView.as_view(), name='admin-pack-player-delete'),
    path('gacha/admin/packs/<int:pack_id>/players/<int:player_id>/return/', AdminPackPlayerReturnView.as_view(), name='admin-pack-player-return'),
    path('gacha/admin/packs/<int:pack_id>/players/return-all/', AdminPackPlayersReturnAllView.as_view(), name='admin-pack-players-return-all'),
    path('gacha/admin/sessions/', AdminPackSessionsView.as_view(), name='admin-pack-sessions'),
]
