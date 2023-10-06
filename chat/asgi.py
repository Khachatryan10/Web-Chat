from django.urls import re_path
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
#os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chat.settings')
from chat_backend import consumers

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter([
                re_path(r"ws/chat/(?P<id>[A-Za-z0-9-]+)/$",
                        consumers.ChatConsumer.as_asgi()),
                re_path(r"ws/notif/$",
                        consumers.GetNotifiedConsumer.as_asgi()),
            ])
        ))
})