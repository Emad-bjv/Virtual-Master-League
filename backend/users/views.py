from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    UserSerializer,
    LeaderboardUserSerializer,
)


class CoachPasswordLoginView(APIView):
    """
    Direct username + password authentication for coaches and admins.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'نام کاربری و رمز عبور الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        username = str(username).strip()

        # Check if user exists by username
        try:
            user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response({'error': 'نام کاربری یا رمز عبور اشتباه است.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Check password strictly
        if not user.check_password(password):
            return Response({'error': 'نام کاربری یا رمز عبور اشتباه است.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'حساب کاربری شما غیرفعال شده است. لطفاً با ادمین تماس بگیرید.'}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data
            },
            status=status.HTTP_200_OK
        )


class QuickLoginView(APIView):
    """
    Fast 1-click JWT authentication for development / testing.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.http import Http404
        if not settings.DEBUG:
            raise Http404("Quick login is not available in production.")

        role = request.data.get('role', 'coach')
        is_admin = (role == 'admin')

        target_username = 'admin' if is_admin else 'coach_test'

        user, created = User.objects.get_or_create(
            username=target_username,
            defaults={
                'virtual_dollars': 1000000.00,
                'role': role,
                'is_staff': is_admin,
                'is_superuser': is_admin,
            }
        )

        user.role = role
        user.is_staff = is_admin
        user.is_superuser = is_admin
        user.save(update_fields=['role', 'is_staff', 'is_superuser'])

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data
            },
            status=status.HTTP_200_OK
        )


class UserProfileView(APIView):
    """
    Retrieves or updates the current authenticated user's profile.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LeaderboardView(APIView):
    """
    Returns global leaderboard ranked by points and virtual wealth.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        users = User.objects.all().order_by('-points', '-virtual_dollars', 'id')[:100]
        
        results = []
        for idx, u in enumerate(users, start=1):
            data = LeaderboardUserSerializer(u).data
            data['rank'] = u.rank if u.rank > 0 else idx
            results.append(data)

        return Response(results, status=status.HTTP_200_OK)


class AdminUserListView(APIView):
    """
    Returns full list of users for Admin Dashboard.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by('-date_joined')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
