from django.urls import path
from .views import LiveSubstitutionCreateView

urlpatterns = [
    path('matches/substitute/', LiveSubstitutionCreateView.as_view(), name='live-substitute'),
]
