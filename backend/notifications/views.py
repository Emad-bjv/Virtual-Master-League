from rest_framework import status, views
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class InboxView(views.APIView):
    """
    Returns the notification inbox.

    - Authenticated user with a team: team notifications + system-wide ones.
    - Otherwise: system-wide notifications only (keeps anonymous GET working).
    """

    def get(self, request, *args, **kwargs):
        queryset = Notification.objects.filter(team__isnull=True)
        user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None

        if user is not None and hasattr(user, 'team') and user.team:
            queryset = queryset | Notification.objects.filter(team=user.team)

        queryset = queryset.distinct().order_by('-created_at')
        return Response(NotificationSerializer(queryset, many=True).data, status=status.HTTP_200_OK)


class ReadNotificationView(views.APIView):
    """
    Marks a single notification as read.
    Returns the stable {status: read} contract consumed by the frontend.
    """

    def post(self, request, pk, *args, **kwargs):
        notification = Notification.objects.filter(pk=pk).first()
        if notification is not None and not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
        return Response({'status': 'read'}, status=status.HTTP_200_OK)
