from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from django.db import close_old_connections
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

User = get_user_model()

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        close_old_connections()
        
        query_string = parse_qs(scope["query_string"].decode())
        token = query_string.get("token")
        
        if not token:
            scope["user"] = AnonymousUser()
        else:
            try:
                UntypedToken(token[0])
                decoded_data = UntypedToken(token[0]).payload
                user = await get_user(decoded_data["user_id"])
                scope["user"] = user
            except (InvalidToken, TokenError, Exception):
                scope["user"] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)
