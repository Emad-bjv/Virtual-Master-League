import re
from rest_framework import serializers
from .models import User, OTPRecord


def normalize_phone_number(phone):
    """
    Normalizes Persian/Arabic digits and formatting to 09XXXXXXXXX standard.
    """
    if not phone:
        return ""

    # Map Persian/Arabic digits to ASCII digits
    persian_arabic_map = str.maketrans({
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
        '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    })
    cleaned = str(phone).translate(persian_arabic_map).strip()

    # Remove non-digits except +
    cleaned = re.sub(r'[^\d+]', '', cleaned)

    if cleaned.startswith('+98'):
        cleaned = '0' + cleaned[3:]
    elif cleaned.startswith('0098'):
        cleaned = '0' + cleaned[4:]
    elif cleaned.startswith('98') and len(cleaned) == 12:
        cleaned = '0' + cleaned[2:]

    return cleaned


class OTPRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)

    def validate_phone_number(self, value):
        normalized = normalize_phone_number(value)
        if not re.match(r'^09\d{9}$', normalized):
            raise serializers.ValidationError("شماره موبایل وارد شده معتبر نیست. شماره باید با 09 شروع شود.")
        return normalized


class OTPVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=6, min_length=6)

    def validate_phone_number(self, value):
        normalized = normalize_phone_number(value)
        if not re.match(r'^09\d{9}$', normalized):
            raise serializers.ValidationError("شماره موبایل وارد شده معتبر نیست.")
        return normalized

    def validate_code(self, value):
        if not value.isdigit() or len(value) != 6:
            raise serializers.ValidationError("کد تایید باید یک عدد ۶ رقمی باشد.")
        return value


class UserSerializer(serializers.ModelSerializer):
    team_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'team_id',
            'phone_number',
            'role',
            'virtual_dollars',
            'avatar',
            'rank',
            'points',
            'is_staff',
            'is_superuser',
        ]
        read_only_fields = ['id', 'phone_number', 'role', 'rank', 'points', 'virtual_dollars', 'is_staff', 'is_superuser']

    def get_team_id(self, obj):
        if hasattr(obj, 'team') and obj.team:
            return obj.team.id
        return None


class LeaderboardUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'rank',
            'phone_number',
            'role',
            'points',
            'virtual_dollars',
            'avatar',
        ]
        read_only_fields = fields
