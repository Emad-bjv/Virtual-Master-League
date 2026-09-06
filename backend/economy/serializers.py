from rest_framework import serializers
from .models import StorePackage, Transaction, PaymentRequest, CardToCardSettings


class StorePackageSerializer(serializers.ModelSerializer):
    is_discount_active = serializers.BooleanField(read_only=True)
    effective_price_irr = serializers.IntegerField(read_only=True)
    discount_pct = serializers.IntegerField(read_only=True)

    class Meta:
        model = StorePackage
        fields = [
            'id', 'name', 'currency_type', 'reward_amount', 'usd_amount',
            'price_irr', 'is_active', 'description', 'icon_code',
            'badge_tag', 'custom_tag_text', 'custom_tag_color',
            'discount_price_irr', 'discount_until', 'is_discount_active',
            'effective_price_irr', 'discount_pct',
            'bonus_amount', 'sort_order', 'created_at'
        ]
        read_only_fields = ['created_at', 'is_discount_active', 'effective_price_irr', 'discount_pct']


class TransactionSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = Transaction
        fields = ['id', 'team', 'team_name', 'currency', 'amount', 'amount_irr',
                  'transaction_type', 'status', 'description', 'created_at']


class CardToCardSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CardToCardSettings
        fields = ['card_number', 'card_holder_name', 'bank_name']


class PaymentRequestSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True)

    class Meta:
        model = PaymentRequest
        fields = [
            'id', 'team', 'team_name', 'package', 'package_name',
            'currency_type', 'reward_amount', 'bonus_amount', 'amount_irr', 'usd_amount', 'receipt_image',
            'status', 'admin_note', 'created_at', 'reviewed_at'
        ]
        read_only_fields = ['team', 'team_name', 'currency_type', 'reward_amount', 'bonus_amount', 'amount_irr', 'usd_amount',
                            'status', 'admin_note', 'created_at', 'reviewed_at']


class PaymentReceiptUploadSerializer(serializers.Serializer):
    receipt_image = serializers.ImageField()
