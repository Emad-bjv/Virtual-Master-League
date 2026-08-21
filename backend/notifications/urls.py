from django.urls import path
from .views import InboxView, ReadNotificationView, DismissNotificationView

urlpatterns = [
    path('notifications/inbox/', InboxView.as_view(), name='notification-inbox'),
    path('notifications/<int:pk>/read/', ReadNotificationView.as_view(), name='notification-read'),
    path('notifications/<int:pk>/dismiss/', DismissNotificationView.as_view(), name='notification-dismiss'),
]
