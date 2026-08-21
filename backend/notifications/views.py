from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, views
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class InboxView(views.APIView):
    """
    Returns the notification inbox.

    - Authenticated user with a team / Coach: team notifications + system-wide ones (target_role IN ['ALL', 'COACH']).
    - Admin users: can see all league notifications (target_role IN ['ALL', 'ADMIN']).
    - Otherwise: system-wide public notifications (target_role='ALL', team=None).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
        is_admin = False
        user_team = None

        if user is not None:
            if user.is_staff or user.is_superuser or getattr(user, 'role', '') == 'admin':
                is_admin = True

            try:
                if hasattr(user, 'team') and user.team:
                    user_team = user.team
            except Exception:
                pass
            if not user_team:
                from teams.models import Team
                user_team = Team.objects.filter(manager=user).first()

        if is_admin:
            queryset = Notification.objects.filter(target_role__in=['ALL', 'ADMIN'])
        elif user_team:
            queryset = Notification.objects.filter(
                (Q(team=user_team) | Q(team__isnull=True)) &
                Q(target_role__in=['ALL', 'COACH'])
            )
        else:
            queryset = Notification.objects.filter(team__isnull=True, target_role='ALL')

        # Optional dismissed filter: ?dismissed=false
        dismissed_param = request.query_params.get('dismissed')
        if dismissed_param is not None:
            if dismissed_param.lower() in ('false', '0'):
                queryset = queryset.filter(is_dismissed=False)
            elif dismissed_param.lower() in ('true', '1'):
                queryset = queryset.filter(is_dismissed=True)

        queryset = queryset.select_related('team').distinct().order_by('-created_at')[:50]
        return Response(NotificationSerializer(queryset, many=True).data, status=status.HTTP_200_OK)


class ReadNotificationView(views.APIView):
    """
    Marks a single notification as read.
    Returns the stable {status: read} contract consumed by the frontend.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk, *args, **kwargs):
        notification = Notification.objects.filter(pk=pk).first()
        if notification is not None and not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])
        return Response({'status': 'read'}, status=status.HTTP_200_OK)


class DismissNotificationView(views.APIView):
    """
    Marks a notification as dismissed to prevent re-triggering alarms or banners.
    Returns {status: 'dismissed', id: notification.id}.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk, *args, **kwargs):
        notification = get_object_or_404(Notification, pk=pk)
        if not notification.is_dismissed:
            notification.is_dismissed = True
            notification.dismissed_at = timezone.now()
            notification.save(update_fields=['is_dismissed', 'dismissed_at'])
        return Response({'status': 'dismissed', 'id': notification.id}, status=status.HTTP_200_OK)
