from rest_framework import serializers
from .models import StorePackage, Transaction, PaymentRequest, CardToCardSettings


class StorePackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorePackage
        fields = ['id', 'name', 'currency_type', 'reward_amount', 'usd_amount', 'price_irr', 'is_active']


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
            'currency_type', 'reward_amount', 'amount_irr', 'usd_amount', 'receipt_image',
            'status', 'admin_note', 'created_at', 'reviewed_at'
        ]
        read_only_fields = ['team', 'team_name', 'currency_type', 'reward_amount', 'amount_irr', 'usd_amount',
                            'status', 'admin_note', 'created_at', 'reviewed_at']


class PaymentReceiptUploadSerializer(serializers.Serializer):
    receipt_image = serializers.ImageField()
