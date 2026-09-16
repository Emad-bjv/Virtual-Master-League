from django.urls import path
from .views import (
    NewsFeedListView,
    NewsDetailView,
    NewsReactView,
    AdminNewsListView,
    AdminNewsDetailView,
    AdminNewsBackfillView
)

urlpatterns = [
    path('', NewsFeedListView.as_view(), name='news_feed_list'),
    path('<int:pk>/', NewsDetailView.as_view(), name='news_detail'),
    path('<int:news_id>/react/', NewsReactView.as_view(), name='news_react'),

    # Admin routes
    path('admin-feed/', AdminNewsListView.as_view(), name='admin_news_list'),
    path('admin-feed/<int:pk>/', AdminNewsDetailView.as_view(), name='admin_news_detail'),
    path('admin-feed/backfill/', AdminNewsBackfillView.as_view(), name='admin_news_backfill'),
]
