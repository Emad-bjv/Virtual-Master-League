from django.urls import path
from .views import (
    TransferMarketListView,
    CreateListingView,
    BuyPlayerDirectView,
    PlaceBidView,
    AutoReleaseOverflowView,
    TransferHistoryListView,
    LeagueDirectoryAPIView,
    TransferOfferCreateView,
    TransferInboxAPIView,
    TransferOfferActionView,
    PlayerReleaseAPIView,
    TransferLogListView,
    FreeAgentsAPIView,
    SignFreeAgentAPIView
)

urlpatterns = [
    path('transfers/market/', TransferMarketListView.as_view(), name='transfer-market'),
    path('transfers/list/', CreateListingView.as_view(), name='transfer-create-listing'),
    path('transfers/buy/', BuyPlayerDirectView.as_view(), name='transfer-buy-direct'),
    path('transfers/bid/', PlaceBidView.as_view(), name='transfer-place-bid'),
    path('transfers/release-overflow/<int:team_id>/', AutoReleaseOverflowView.as_view(), name='transfer-release-overflow'),
    path('transfers/history/', TransferHistoryListView.as_view(), name='transfer-history'),
    
    # New Negotiation Hub Routes
    path('transfers/league-teams/', LeagueDirectoryAPIView.as_view(), name='league-teams'),
    path('transfers/free-agents/', FreeAgentsAPIView.as_view(), name='free-agents'),
    path('transfers/free-agents/<int:pk>/sign/', SignFreeAgentAPIView.as_view(), name='sign-free-agent'),
    path('transfers/offers/', TransferOfferCreateView.as_view(), name='create-offer'),
    path('transfers/inbox/', TransferInboxAPIView.as_view(), name='inbox'),
    path('transfers/offers/<int:pk>/<str:action>/', TransferOfferActionView.as_view(), name='offer-action'),
    path('transfers/players/<int:pk>/release/', PlayerReleaseAPIView.as_view(), name='player-release'),
    path('transfers/logs/', TransferLogListView.as_view(), name='transfer-logs'),
]
