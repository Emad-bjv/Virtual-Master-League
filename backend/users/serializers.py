from rest_framework import serializers
from .models import User


class OTPRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=11)

    def validate_phone_number(self, value):
        if not value or not isinstance(value, str):
            raise serializers.ValidationError("شماره موبایل نامعتبر است.")
        if len(value) != 11 or not value.startswith('09') or not value.isdigit():
            raise serializers.ValidationError("فرمت شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد.")
        return value


class OTPVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=11)
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_phone_number(self, value):
        if not value or len(value) != 11 or not value.startswith('09') or not value.isdigit():
            raise serializers.ValidationError("فرمت شماره موبایل نامعتبر است.")
        return value

    def validate_code(self, value):
        if not value or len(value) != 6 or not value.isdigit():
            raise serializers.ValidationError("کد تایید باید ۶ رقم عددی باشد.")
        return value


class UserSerializer(serializers.ModelSerializer):
    team_id = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()

    admin_role = serializers.SerializerMethodField()
    admin_title = serializers.SerializerMethodField()
    admin_permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'birth_date',
            'first_name',
            'last_name',
            'team_id',
            'team_name',
            'role',
            'virtual_dollars',
            'avatar',
            'rank',
            'points',
            'is_staff',
            'is_superuser',
            'admin_role',
            'admin_title',
            'admin_permissions',
        ]
        read_only_fields = ['id', 'username', 'role', 'rank', 'points', 'virtual_dollars', 'is_staff', 'is_superuser']

    def get_team_id(self, obj):
        if hasattr(obj, 'team') and obj.team:
            return obj.team.id
        return None

    def get_team_name(self, obj):
        if hasattr(obj, 'team') and obj.team:
            return obj.team.name
        return None

    def get_admin_role(self, obj):
        if obj.is_superuser or getattr(obj, 'role', '') == 'superadmin':
            return 'superadmin'
        if hasattr(obj, 'admin_profile') and obj.admin_profile:
            return obj.admin_profile.admin_role
        if getattr(obj, 'role', '') == 'admin' or obj.is_staff:
            return 'superadmin'
        return None

    def get_admin_title(self, obj):
        if obj.is_superuser or getattr(obj, 'role', '') == 'superadmin':
            return 'مدیر ارشد سامانه (سوپرادمین)'
        if hasattr(obj, 'admin_profile') and obj.admin_profile:
            return obj.admin_profile.title or 'ادمین'
        if getattr(obj, 'role', '') == 'admin' or obj.is_staff:
            return 'ادمین'
        return None

    def get_admin_permissions(self, obj):
        return obj.get_admin_permissions()


class AdminProfileSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import AdminProfile
        model = AdminProfile
        fields = ['id', 'admin_role', 'title', 'permissions', 'created_at', 'updated_at']


class AdminUserManageSerializer(serializers.ModelSerializer):
    admin_profile = AdminProfileSerializer(read_only=True)
    admin_role = serializers.CharField(write_only=True, required=False, default='custom')
    title = serializers.CharField(write_only=True, required=False, allow_blank=True, default='ادمین سامانه')
    permissions = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'role', 'is_active', 'is_staff', 'is_superuser',
            'date_joined', 'last_login', 'team_name', 'admin_profile',
            'admin_role', 'title', 'permissions', 'password'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'team_name']

    def get_team_name(self, obj):
        if hasattr(obj, 'team') and obj.team:
            return obj.team.name
        return None


class LeaderboardUserSerializer(serializers.ModelSerializer):
    team_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'rank',
            'username',
            'full_name',
            'birth_date',
            'team_name',
            'role',
            'points',
            'virtual_dollars',
            'avatar',
        ]
        read_only_fields = fields

    def get_team_name(self, obj):
        if hasattr(obj, 'team') and obj.team:
            return obj.team.name
        return None
