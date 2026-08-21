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
