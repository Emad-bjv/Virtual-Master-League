from django.urls import path
from .views import GlobalSettingsView, AdminDatabaseSummaryView, AdminDatabaseTableView

urlpatterns = [
    path('settings/', GlobalSettingsView.as_view(), name='global_settings'),
    path('db-explorer/summary/', AdminDatabaseSummaryView.as_view(), name='admin_db_summary'),
    path('db-explorer/table/', AdminDatabaseTableView.as_view(), name='admin_db_table'),
]
