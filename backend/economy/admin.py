from django.contrib import admin, messages
from django.utils import timezone
from django.db import transaction as db_transaction
from .models import StorePackage, Transaction, CardToCardSettings, PaymentRequest


@admin.register(CardToCardSettings)
class CardToCardSettingsAdmin(admin.ModelAdmin):
    list_display = ('card_holder_name', 'card_number', 'bank_name', 'is_active')
    list_editable = ('is_active',)


@admin.register(StorePackage)
class StorePackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'currency_type', 'reward_amount', 'usd_amount', 'price_irr', 'is_active', 'created_at')
    list_filter = ('currency_type', 'is_active')
    search_fields = ('name',)


@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'team', 'package', 'currency_type', 'reward_amount', 'amount_irr', 'status', 'created_at', 'reviewed_at')
    list_filter = ('currency_type', 'status', 'created_at')
    search_fields = ('team__name', 'package__name', 'admin_note')
    readonly_fields = ('created_at', 'reviewed_at')
    actions = ['approve_payments', 'reject_payments']

    @admin.action(description="تایید پرداخت‌های انتخاب‌شده و شارژ حساب تیم (جم یا دلار)")
    def approve_payments(self, request, queryset):
        approved_count = 0
        for payment_req in queryset:
            if payment_req.status in ('PENDING_REVIEW', 'AWAITING_RECEIPT'):
                with db_transaction.atomic():
                    payment_req.status = 'APPROVED'
                    payment_req.reviewed_at = timezone.now()
                    payment_req.save(update_fields=['status', 'reviewed_at'])

                    team = payment_req.team
                    currency = payment_req.currency_type or 'BUDGET'
                    
                    if currency == 'GEMS':
                        gem_amount = int(payment_req.reward_amount or 0)
                        team.gems += gem_amount
                        team.save(update_fields=['gems'])
                        txn_amount = Decimal(gem_amount)
                    else:
                        budget_amount = payment_req.reward_amount if (payment_req.reward_amount and payment_req.reward_amount > 0) else payment_req.usd_amount
                        team.budget += budget_amount
                        team.save(update_fields=['budget'])
                        txn_amount = budget_amount

                    Transaction.objects.create(
                        team=team,
                        currency=currency,
                        amount=txn_amount,
                        amount_irr=payment_req.amount_irr,
                        transaction_type='STORE_PURCHASE',
                        status='SUCCESS',
                        description=f"خرید بسته {payment_req.package.name if payment_req.package else ''} ({currency}) - تایید از پنل ادمین"
                    )
                    approved_count += 1

        messages.success(request, f"{approved_count} درخواست پرداخت تایید شد و مبالغ به حساب تیم‌ها واریز گردید.")

    @admin.action(description="رد کردن پرداخت‌های انتخاب‌شده")
    def reject_payments(self, request, queryset):
        count = queryset.filter(status__in=['PENDING_REVIEW', 'AWAITING_RECEIPT']).update(
            status='REJECTED',
            reviewed_at=timezone.now()
        )
        messages.warning(request, f"{count} درخواست پرداخت رد شد.")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('team', 'currency', 'amount', 'amount_irr', 'transaction_type', 'status', 'created_at')
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('team__name', 'description')
    readonly_fields = ('created_at',)
