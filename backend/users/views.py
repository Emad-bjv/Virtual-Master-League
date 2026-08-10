import random
import secrets
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from django.core.cache import cache

from .models import User, OTPRecord
from .serializers import (
    OTPRequestSerializer,
    OTPVerifySerializer,
    UserSerializer,
    LeaderboardUserSerializer,
)


class OTPRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone_number = serializer.validated_data['phone_number']

        cooldown_key = f"otp_cooldown:{phone_number}"
        if cache.get(cooldown_key):
            return Response(
                {"detail": "لطفاً پیش از درخواست مجدد ۶۰ ثانیه صبر کنید."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Cryptographic 6-digit random OTP generation for all requests
        code = "".join(secrets.choice("0123456789") for _ in range(6))

        # Cache storage: code (300s TTL), cooldown (60s TTL), attempts reset to 0
        cache.set(f"otp_code:{phone_number}", code, 300)
        cache.set(cooldown_key, True, 60)
        cache.set(f"otp_attempts:{phone_number}", 0, 300)

        now = timezone.now()
        OTPRecord.objects.create(
            phone_number=phone_number,
            code=code,
            expires_at=now + timedelta(seconds=300),
        )

        response_data = {
            "message": "کد تایید با موفقیت ارسال شد."
        }
        if getattr(settings, 'DEBUG', True):
            response_data["otp_code"] = code

        return Response(response_data, status=status.HTTP_200_OK)


class OTPVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        phone_number = serializer.validated_data['phone_number']
        code = serializer.validated_data['code']

        code_key = f"otp_code:{phone_number}"
        attempts_key = f"otp_attempts:{phone_number}"
        cooldown_key = f"otp_cooldown:{phone_number}"

        # Fetch latest unused OTPRecord from database
        otp_record = OTPRecord.objects.filter(
            phone_number=phone_number,
            is_used=False
        ).order_by('-created_at').first()

        cached_code = cache.get(code_key)

        if not otp_record and not cached_code:
            return Response(
                {"detail": "کد تایید یافت نشد یا منقضی شده است."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if otp_record and otp_record.is_expired():
            return Response(
                {"detail": "کد تایید یافت نشد یا منقضی شده است."},
                status=status.HTTP_400_BAD_REQUEST
            )

        attempts = cache.get(attempts_key, 0)
        if attempts >= 5:
            cache.delete(code_key)
            return Response(
                {"detail": "تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً مجدداً کد دریافت کنید."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Strictly validate code against DB OTPRecord (or cache fallback)
        expected_code = otp_record.code if otp_record else cached_code
        if expected_code != code:
            attempts += 1
            cache.set(attempts_key, attempts, 300)
            if attempts >= 5:
                cache.delete(code_key)
                return Response(
                    {"detail": "تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً مجدداً کد دریافت کنید."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {"detail": "کد تایید وارد شده اشتباه است."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # OTP verified successfully -> clear cache keys
        cache.delete(code_key)
        cache.delete(attempts_key)
        cache.delete(cooldown_key)

        # Mark DB OTPRecord as used
        if otp_record:
            otp_record.is_used = True
            otp_record.save(update_fields=['is_used'])

        user, created = User.objects.get_or_create(
            phone_number=phone_number,
            defaults={
                'virtual_dollars': 1000000.00,
                'role': 'coach',
            }
        )

        # First login / fresh account: automatically create the manager's club
        # so the frontend (which relies on user.team_id) has a real team to bind to.
        if not hasattr(user, 'team') or user.team is None:
            _ensure_user_team(user)

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data
            },
            status=status.HTTP_200_OK
        )


def _ensure_user_team(user):
    """
    Creates a default club (team + facilities + gameplan) for a user without one.
    Returns the created Team (or the existing one).
    """
    from teams.models import Team, ClubFacilities, TeamGamePlan

    if hasattr(user, 'team') and user.team is not None:
        return user.team

    # Derive a unique club name from the phone number (e.g. باشگاه 5678)
    suffix = user.phone_number[-4:] if user.phone_number else '0000'
    name = f"باشگاه {suffix}"
    base_name = name
    counter = 2
    while Team.objects.filter(name=name).exists():
        name = f"{base_name}-{counter}"
        counter += 1

    team = Team.objects.create(
        manager=user,
        name=name,
        budget=1000000.00,
        wage_cap=10000.00,
    )
    ClubFacilities.objects.create(team=team)
    TeamGamePlan.objects.create(team=team)
    return team


class UserProfileView(APIView):
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


class QuickLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        role = request.data.get('role', 'coach')
        is_admin = (role == 'admin')

        # Each role gets its own dedicated test account
        phone_number = '09000000001' if is_admin else '09000000002'

        user, created = User.objects.get_or_create(
            phone_number=phone_number,
            defaults={
                'virtual_dollars': 1000000.00,
                'role': role,
                'is_staff': is_admin,
                'is_superuser': is_admin,
            }
        )

        # Always sync role fields — avoids stale role from a previous login
        user.role = role
        user.is_staff = is_admin
        user.is_superuser = is_admin
        user.save(update_fields=['role', 'is_staff', 'is_superuser'])

        if not hasattr(user, 'team') or user.team is None:
            _ensure_user_team(user)

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data
            },
            status=status.HTTP_200_OK
        )


class LeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        users = User.objects.all().order_by('-points', '-virtual_dollars', 'id')[:100]
        
        # Calculate dynamic ranks for presentation
        results = []
        for idx, u in enumerate(users, start=1):
            data = LeaderboardUserSerializer(u).data
            data['rank'] = u.rank if u.rank > 0 else idx
            results.append(data)

        return Response(results, status=status.HTTP_200_OK)

class AdminUserListView(APIView):
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by('-date_joined')
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

