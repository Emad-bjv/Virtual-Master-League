from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeamViewSet, PlayerViewSet, PositionChoicesView

router = DefaultRouter()
router.register(r'teams', TeamViewSet)
router.register(r'players', PlayerViewSet)

urlpatterns = [
    path('positions/', PositionChoicesView.as_view(), name='position-choices'),
    path('', include(router.urls)),
]
