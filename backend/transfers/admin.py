from django.contrib import admin, messages
from .models import TransferListing, TransferBid, TransferHistory
from .services import finalize_auction


@admin.register(TransferListing)
class TransferListingAdmin(admin.ModelAdmin):
    list_display = (
        'player', 'seller_team', 'listing_type', 'price_usd',
        'highest_bid', 'highest_bidder', 'status', 'created_at'
    )
    list_filter = ('listing_type', 'status', 'created_at')
    search_fields = ('player__name', 'seller_team__name', 'highest_bidder__name')
    actions = ['action_finalize_auction']

    @admin.action(description="نهایی‌سازی مزایده‌های انتخاب‌شده")
    def action_finalize_auction(self, request, queryset):
        success_count = 0
        for listing in queryset.filter(listing_type='AUCTION', status='ACTIVE'):
            res = finalize_auction(listing.id)
            if res['success']:
                success_count += 1
        messages.success(request, f"{success_count} مزایده با موفقیت نهایی‌سازی و انتقال یافت.")


@admin.register(TransferBid)
class TransferBidAdmin(admin.ModelAdmin):
    list_display = ('listing', 'bidder_team', 'amount_usd', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('bidder_team__name', 'listing__player__name')


@admin.register(TransferHistory)
class TransferHistoryAdmin(admin.ModelAdmin):
    list_display = ('player', 'seller_team', 'buyer_team', 'price_usd', 'transfer_type', 'transferred_at')
    list_filter = ('transfer_type', 'transferred_at')
    search_fields = ('player__name', 'seller_team__name', 'buyer_team__name')
