from django.urls import path
from .views import SeasonPassViewSet

urlpatterns = [
    path('status/', SeasonPassViewSet.as_view({'get': 'status'}), name='season-pass-status'),
    path('claim-task/', SeasonPassViewSet.as_view({'post': 'claim_task'}), name='season-pass-claim-task'),
    path('claim-level/', SeasonPassViewSet.as_view({'post': 'claim_level'}), name='season-pass-claim-level'),
    path('admin-overview/', SeasonPassViewSet.as_view({'get': 'admin_overview'}), name='season-pass-admin-overview'),
    path('admin-seed-levels/', SeasonPassViewSet.as_view({'post': 'admin_seed_levels'}), name='season-pass-admin-seed-levels'),
    path('admin-seed-tasks/', SeasonPassViewSet.as_view({'post': 'admin_seed_tasks'}), name='season-pass-admin-seed-tasks'),
    path('admin-auto-assign-legends/', SeasonPassViewSet.as_view({'post': 'admin_auto_assign_legends'}), name='season-pass-admin-auto-assign-legends'),
    path('admin-assign-legend/', SeasonPassViewSet.as_view({'post': 'admin_assign_legend'}), name='season-pass-admin-assign-legend'),
    path('admin-save-level/', SeasonPassViewSet.as_view({'post': 'admin_save_level'}), name='season-pass-admin-save-level'),
]

