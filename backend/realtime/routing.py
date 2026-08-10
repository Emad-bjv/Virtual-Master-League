from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/admin/$', consumers.AdminChannelConsumer.as_asgi()),
    re_path(r'ws/match/(?P<match_id>\w+)/$', consumers.MatchLiveConsumer.as_asgi()),
]
