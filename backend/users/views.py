from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .permissions import CanManageAdmins
from .serializers import (
    UserSerializer,
    LeaderboardUserSerializer,
)


def normalize_text_and_digits(text):
    if not text:
        return ""
    persian_arabic_to_english = {
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
        'ي': 'ی', 'ك': 'ک', 'ة': 'ه',
    }
    res = []
    for ch in str(text):
        res.append(persian_arabic_to_english.get(ch, ch))
    return "".join(res).strip()


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
        norm_username = normalize_text_and_digits(username)
        fa_norm_username = normalize_text_and_digits(username)
        password = str(raw_password).strip()
        norm_password = normalize_text_and_digits(password)

        # 1. Look up user with all variations
        user = None
        lookup_candidates = [
            norm_username,
            fa_norm_username,
            username,
            f"coach_{norm_username}",
            f"coach_{fa_norm_username}",
            f"coach_{username}",
        ]
        if norm_username.startswith('coach_'):
            lookup_candidates.append(norm_username[6:])
        if fa_norm_username.startswith('coach_'):
            lookup_candidates.append(fa_norm_username[6:])
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
            for t_name in [fa_norm_username, norm_username, username]:
                team = Team.objects.filter(name__iexact=t_name).first()
                if not team:
                    team = Team.objects.filter(name__icontains=t_name).first()
                if team and team.manager:
                    user = team.manager
                    break

        if not user:
            return Response({'error': 'نام کاربری یا رمز عبور اشتباه است.'}, status=status.HTTP_401_UNAUTHORIZED)

        # 3. Check password (strict check + normalized digits check)
        is_password_correct = user.check_password(password) or user.check_password(norm_password)

        # Fallback 1: Plaintext password match in DB (auto-upgrade to secure hash)
        if not is_password_correct:
            if user.password == password or user.password == norm_password:
                user.set_password(password)
                user.save(update_fields=['password'])
                is_password_correct = True

        # Fallback 2: Legacy / uninitialized coach accounts
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


class AdminManagementView(APIView):
    """
    List and create admin users with granular permissions and role presets.
    """
    permission_classes = [permissions.IsAuthenticated, CanManageAdmins]

    def get(self, request):
        from django.db.models import Q
        from .models import AdminProfile
        from .serializers import AdminUserManageSerializer

        admins = User.objects.filter(
            Q(role__in=['admin', 'superadmin']) | Q(is_staff=True) | Q(is_superuser=True) | Q(admin_profile__isnull=False)
        ).distinct().order_by('-is_superuser', 'username')

        # Auto-initialize AdminProfile for legacy admins
        for admin in admins:
            if not hasattr(admin, 'admin_profile') or not admin.admin_profile:
                initial_role = 'superadmin' if admin.is_superuser else 'custom'
                initial_perms = ['*'] if admin.is_superuser else []
                AdminProfile.objects.create(
                    user=admin,
                    admin_role=initial_role,
                    title='مدیر ارشد سامانه' if admin.is_superuser else 'ادمین سامانه',
                    permissions=initial_perms
                )

        admins = User.objects.filter(
            Q(role__in=['admin', 'superadmin']) | Q(is_staff=True) | Q(is_superuser=True) | Q(admin_profile__isnull=False)
        ).distinct().select_related('admin_profile').order_by('-is_superuser', 'username')

        serializer = AdminUserManageSerializer(admins, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        from .models import AdminProfile
        from .serializers import AdminUserManageSerializer

        data = request.data
        user_id = data.get('user_id')
        admin_role = data.get('admin_role', 'custom')
        title = (data.get('title') or 'ادمین سامانه').strip()
        permissions_list = data.get('permissions', [])

        # Security check: only superuser can grant superadmin role
        if admin_role == 'superadmin' and not request.user.is_superuser:
            return Response({'error': 'تنها سوپرادمین‌ها اجازه اعطای نقش سوپرادمین را دارند.'}, status=status.HTTP_403_FORBIDDEN)

        if user_id:
            # Promote existing user
            try:
                target_user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'کاربر مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

            target_user.role = 'admin'
            target_user.is_staff = True
            if admin_role == 'superadmin':
                target_user.is_superuser = True
            target_user.save()

            profile, _ = AdminProfile.objects.get_or_create(user=target_user)
            profile.admin_role = admin_role
            profile.title = title
            profile.permissions = permissions_list
            profile.save()

            return Response(AdminUserManageSerializer(target_user).data, status=status.HTTP_201_CREATED)

        else:
            # Create new admin user
            username = str(data.get('username', '')).strip()
            password = str(data.get('password', '')).strip()
            full_name = str(data.get('full_name', '')).strip()

            if not username:
                return Response({'error': 'نام کاربری الزامی است.'}, status=status.HTTP_400_BAD_REQUEST)
            if not password or len(password) < 4:
                return Response({'error': 'کلمه عبور باید حداقل ۴ کاراکتر باشد.'}, status=status.HTTP_400_BAD_REQUEST)

            if User.objects.filter(username__iexact=username).exists():
                return Response({'error': 'کاربری با این نام کاربری از قبل وجود دارد.'}, status=status.HTTP_400_BAD_REQUEST)

            new_user = User.objects.create(
                username=username,
                full_name=full_name,
                role='admin',
                is_staff=True,
                is_superuser=(admin_role == 'superadmin'),
            )
            new_user.set_password(password)
            new_user.save()

            AdminProfile.objects.create(
                user=new_user,
                admin_role=admin_role,
                title=title,
                permissions=permissions_list
            )

            return Response(AdminUserManageSerializer(new_user).data, status=status.HTTP_201_CREATED)


class AdminDetailManagementView(APIView):
    """
    Update or demote/remove an admin user.
    """
    permission_classes = [permissions.IsAuthenticated, CanManageAdmins]

    def patch(self, request, pk):
        from .models import AdminProfile
        from .serializers import AdminUserManageSerializer

        try:
            target_user = User.objects.select_related('admin_profile').get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'ادمین مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        # Superadmin protection: only superadmin can edit superadmin
        if target_user.is_superuser and not request.user.is_superuser:
            return Response({'error': 'شما اجازه ویرایش یا تغییر حساب کاربری سوپرادمین را ندارید.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data

        if 'full_name' in data:
            target_user.full_name = str(data['full_name']).strip()
        if 'is_active' in data:
            if target_user.id == request.user.id and not data['is_active']:
                return Response({'error': 'شما نمی‌توانید حساب کاربری خودتان را غیرفعال کنید.'}, status=status.HTTP_400_BAD_REQUEST)
            target_user.is_active = bool(data['is_active'])
        if 'password' in data and data['password']:
            target_user.set_password(str(data['password']).strip())

        profile, _ = AdminProfile.objects.get_or_create(user=target_user)
        if 'admin_role' in data:
            new_role = data['admin_role']
            if new_role == 'superadmin' and not request.user.is_superuser:
                return Response({'error': 'تنها سوپرادمین می‌تواند نقش سوپرادمین اعطا کند.'}, status=status.HTTP_403_FORBIDDEN)
            profile.admin_role = new_role
            if new_role == 'superadmin':
                target_user.is_superuser = True
                target_user.is_staff = True
            elif target_user.is_superuser and not request.user.is_superuser:
                return Response({'error': 'شما اجازه حذف دسترسی سوپرادمین از این حساب را ندارید.'}, status=status.HTTP_403_FORBIDDEN)

        if 'title' in data:
            profile.title = (data['title'] or 'ادمین').strip()
        if 'permissions' in data:
            profile.permissions = data['permissions']

        target_user.save()
        profile.save()

        return Response(AdminUserManageSerializer(target_user).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            target_user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'ادمین مورد نظر یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        # Protection: Cannot demote/delete superadmin or self
        if target_user.is_superuser:
            return Response({'error': 'حساب‌های سوپرادمین مصون بوده و قابل عزل یا حذف نیستند.'}, status=status.HTTP_403_FORBIDDEN)
        if target_user.id == request.user.id:
            return Response({'error': 'شما نمی‌توانید حساب خودتان را عزل کنید.'}, status=status.HTTP_400_BAD_REQUEST)

        # Demote back to coach
        target_user.role = 'coach'
        target_user.is_staff = False
        target_user.save(update_fields=['role', 'is_staff'])

        # Delete AdminProfile
        if hasattr(target_user, 'admin_profile'):
            target_user.admin_profile.delete()

        return Response({'message': f'نقش ادمین از کاربر {target_user.username} سلب شد و به سطح مربی بازگشت.'}, status=status.HTTP_200_OK)


class AdminCandidatesView(APIView):
    """
    Search available coaches and users to promote to Admin.
    """
    permission_classes = [permissions.IsAuthenticated, CanManageAdmins]

    def get(self, request):
        from django.db.models import Q
        query = request.query_params.get('q', '').strip()
        users_qs = User.objects.filter(is_superuser=False).exclude(role__in=['admin', 'superadmin'])
        if query:
            users_qs = users_qs.filter(
                Q(username__icontains=query) | Q(full_name__icontains=query) | Q(team__name__icontains=query)
            )
        users = users_qs.select_related('team').order_by('-date_joined')[:30]

        results = []
        for u in users:
            results.append({
                'id': u.id,
                'username': u.username,
                'full_name': u.full_name,
                'team_name': u.team.name if hasattr(u, 'team') and u.team else None,
                'role': u.role,
            })
        return Response(results, status=status.HTTP_200_OK)
