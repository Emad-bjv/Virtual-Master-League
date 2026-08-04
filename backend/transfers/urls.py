from django.urls import path
from .views import (
    TransferMarketListView,
    CreateListingView,
    BuyPlayerDirectView,
    PlaceBidView,
    AutoReleaseOverflowView,
    TransferHistoryListView
)

urlpatterns = [
    path('transfers/market/', TransferMarketListView.as_view(), name='transfer-market'),
    path('transfers/list/', CreateListingView.as_view(), name='transfer-create-listing'),
    path('transfers/buy/', BuyPlayerDirectView.as_view(), name='transfer-buy-direct'),
    path('transfers/bid/', PlaceBidView.as_view(), name='transfer-place-bid'),
    path('transfers/release-overflow/<int:team_id>/', AutoReleaseOverflowView.as_view(), name='transfer-release-overflow'),
    path('transfers/history/', TransferHistoryListView.as_view(), name='transfer-history'),
]
