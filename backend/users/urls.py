from django.urls import path
from .views import (
    UserProfileView,
    LeaderboardView,
    QuickLoginView,
    CoachPasswordLoginView,
    AdminUserListView,
)

urlpatterns = [
    path('auth/login/', CoachPasswordLoginView.as_view(), name='password-login'),
    path('auth/quick/', QuickLoginView.as_view(), name='quick-login'),
    path('me/', UserProfileView.as_view(), name='user-me'),
    path('leaderboard/', LeaderboardView.as_view(), name='user-leaderboard'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-users-list'),
]
