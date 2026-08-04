from django.urls import path
from .views import GachaPackListView, OpenGachaPackView, TeamPityView

urlpatterns = [
    path('gacha/packs/', GachaPackListView.as_view(), name='gacha-packs'),
    path('gacha/open/', OpenGachaPackView.as_view(), name='gacha-open'),
    path('gacha/pity/<int:team_id>/', TeamPityView.as_view(), name='gacha-pity'),
]
