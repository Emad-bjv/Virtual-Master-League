"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('sys-admin/', admin.site.urls),
    path('api/admin/', include('admin_api.urls')),
    path('api/core/', include('core.urls')),
    path('api/users/', include('users.urls')),
    path('api/', include('teams.urls')),
    path('api/', include('matches.urls')),
    path('api/economy/', include('economy.urls')),
    path('api/', include('gacha.urls')),
    path('api/', include('transfers.urls')),
    path('api/', include('notifications.urls')),
    path('api/season-pass/', include('season_pass.urls')),
    path('api/audit/', include('audit.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
