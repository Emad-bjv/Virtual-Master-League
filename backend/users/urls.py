from django.urls import path
from .views import (
    OTPRequestView,
    OTPVerifyView,
    UserProfileView,
    LeaderboardView,
    QuickLoginView,
    AdminUserListView,
)

urlpatterns = [
    path('auth/otp/request/', OTPRequestView.as_view(), name='otp-request'),
    path('auth/otp/verify/', OTPVerifyView.as_view(), name='otp-verify'),
    path('auth/quick/', QuickLoginView.as_view(), name='quick-login'),
    path('me/', UserProfileView.as_view(), name='user-me'),
    path('leaderboard/', LeaderboardView.as_view(), name='user-leaderboard'),
    path('admin-list/', AdminUserListView.as_view(), name='admin-user-list'),
]
