from rest_framework import serializers
from .models import StorePackage, Transaction


class StorePackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorePackage
        fields = ['id', 'name', 'usd_amount', 'price_irr', 'is_active']


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'amount_usd', 'amount_irr', 'transaction_type', 'status', 'zarinpal_ref_id', 'description', 'created_at']
