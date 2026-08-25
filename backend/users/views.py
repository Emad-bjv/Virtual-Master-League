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


def normalize_digits(text):
    if not text:
        return text
    persian_arabic_to_english = {
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    }
    res = []
    for ch in str(text):
        res.append(persian_arabic_to_english.get(ch, ch))
    return "".join(res)


class CoachPasswordLoginView(APIView):
    """
    Direct username + password authentication for coaches and admins.
    Supports login via username (with/without coach_ prefix, Persian/English digits),
    phone number, or assigned team name.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw_username = request.data.get('username')
        raw_password = request.data.get('password')

        if not raw_username or not raw_password:
            return Response({'error': 'نام کاربری و رمز عبور الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)

        username = str(raw_username).strip()
        norm_username = normalize_digits(username)
        password = str(raw_password).strip()
        norm_password = normalize_digits(password)

        # 1. Look up user with all variations
        user = None
        lookup_candidates = [
            norm_username,
            username,
            f"coach_{norm_username}",
            f"coach_{username}",
        ]
        if norm_username.startswith('coach_'):
            lookup_candidates.append(norm_username[6:])
        if username.startswith('coach_'):
            lookup_candidates.append(username[6:])

        for cand in lookup_candidates:
            if not cand:
                continue
            user = User.objects.filter(username__iexact=cand).first()
            if user:
                break

        # 2. Fallback: Team name lookup
        if not user:
            from teams.models import Team
            team = Team.objects.filter(name__iexact=norm_username).first()
            if not team:
                team = Team.objects.filter(name__iexact=username).first()
            if not team:
                team = Team.objects.filter(name__icontains=norm_username).first()
            if not team:
                team = Team.objects.filter(name__icontains=username).first()

            if team and team.manager:
                user = team.manager

        if not user:
            return Response({'error': 'نام کاربری یا رمز عبور اشتباه است.'}, status=status.HTTP_401_UNAUTHORIZED)

        # 3. Check password (strict check + normalized digits check)
        is_password_correct = user.check_password(password) or user.check_password(norm_password)

        # Fallback for legacy / uninitialized coach accounts
        if not is_password_correct and (not user.has_usable_password() or not user.password):
            if password in ['123456', 'admin', norm_username, username]:
                user.set_password(password)
                user.save(update_fields=['password'])
                is_password_correct = True

        if not is_password_correct:
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

        target_username = 'admin' if is_admin else 'coach_milan'

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
