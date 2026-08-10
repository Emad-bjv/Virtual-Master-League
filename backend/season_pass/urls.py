from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SeasonPassViewSet

router = DefaultRouter()
router.register(r'', SeasonPassViewSet, basename='season_pass')

urlpatterns = [
    path('', include(router.urls)),
]
