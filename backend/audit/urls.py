from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminAuditLogViewSet

router = DefaultRouter()
router.register(r'logs', AdminAuditLogViewSet, basename='auditlog')

urlpatterns = [
    path('', include(router.urls)),
]
