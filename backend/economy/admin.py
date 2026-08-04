from django.contrib import admin
from .models import StorePackage, Transaction


@admin.register(StorePackage)
class StorePackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'usd_amount', 'price_irr', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('team', 'amount_usd', 'amount_irr', 'transaction_type', 'status', 'zarinpal_ref_id', 'created_at')
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('team__name', 'zarinpal_authority', 'zarinpal_ref_id')
    readonly_fields = ('created_at',)
