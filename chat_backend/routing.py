from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<id>[A-Za-z0-9-]+)/$", consumers.ChatConsumer.as_asgi()),
    re_path(r"ws/notif/$", consumers.GetNotifiedConsumer.as_asgi()),
]