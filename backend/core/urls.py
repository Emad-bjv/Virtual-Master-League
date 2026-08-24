from django.urls import path
from .views import GlobalSettingsView, PublicFeatureFlagsView, AdminDatabaseSummaryView, AdminDatabaseTableView

urlpatterns = [
    path('settings/', GlobalSettingsView.as_view(), name='global_settings'),
    path('feature-flags/', PublicFeatureFlagsView.as_view(), name='public_feature_flags'),
    path('db-explorer/summary/', AdminDatabaseSummaryView.as_view(), name='admin_db_summary'),
    path('db-explorer/table/', AdminDatabaseTableView.as_view(), name='admin_db_table'),
]

