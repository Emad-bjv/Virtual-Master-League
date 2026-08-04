from django.db import models
from teams.models import Team, Player


class TransferListing(models.Model):
    LISTING_TYPES = [
        ('FIXED_PRICE', 'قیمت مقطوع'),
        ('AUCTION', 'مزایده'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'فعال'),
        ('SOLD', 'فروخته شده'),
        ('CANCELLED', 'لغو شده'),
        ('EXPIRED', 'منقضی شده'),
    ]

    player = models.ForeignKey(
        Player, on_delete=models.CASCADE,
        related_name='transfer_listings', verbose_name="بازیکن"
    )
    seller_team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='listings_sold', verbose_name="تیم فروشنده"
    )
    listing_type = models.CharField(
        max_length=15, choices=LISTING_TYPES, default='FIXED_PRICE', verbose_name="نوع فروش"
    )
    price_usd = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="قیمت فروش / قیمت پایه مزایده"
    )
    highest_bid = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00, verbose_name="بالاترین پیشنهاد"
    )
    highest_bidder = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='bids_won', verbose_name="بالاترین پیشنهاددهنده"
    )
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default='ACTIVE', verbose_name="وضعیت"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="تاریخ انقضا")

    class Meta:
        verbose_name = "آگهی نقل و انتقال"
        verbose_name_plural = "آگهی‌های نقل و انتقالات"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.player.name} - [{self.get_listing_type_display()}] {self.price_usd} USD ({self.status})"


class TransferBid(models.Model):
    listing = models.ForeignKey(
        TransferListing, on_delete=models.CASCADE,
        related_name='bids', verbose_name="آگهی مربوطه"
    )
    bidder_team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='bids_made', verbose_name="تیم پیشنهاددهنده"
    )
    amount_usd = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="مبلغ پیشنهاد (USD)"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت پیشنهاد")

    class Meta:
        verbose_name = "پیشنهاد مزایده"
        verbose_name_plural = "پیشنهادهای مزایده"
        ordering = ['-amount_usd']

    def __str__(self):
        return f"{self.bidder_team.name} ➔ {self.amount_usd} USD on {self.listing.player.name}"


class TransferHistory(models.Model):
    player = models.ForeignKey(
        Player, on_delete=models.SET_NULL, null=True,
        related_name='transfer_history', verbose_name="بازیکن"
    )
    seller_team = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sales_history', verbose_name="تیم فروشنده"
    )
    buyer_team = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='purchases_history', verbose_name="تیم خریدار"
    )
    price_usd = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="مبلغ معامله"
    )
    transfer_type = models.CharField(
        max_length=20, verbose_name="نوع انتقال"
    ) # FIXED_PRICE, AUCTION, AUTO_RELEASE
    transferred_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ انتقال")

    class Meta:
        verbose_name = "تاریخچه نقل و انتقال"
        verbose_name_plural = "تاریخچه نقل و انتقالات"
        ordering = ['-transferred_at']

    def __str__(self):
        s_name = self.seller_team.name if self.seller_team else "Free Agent"
        b_name = self.buyer_team.name if self.buyer_team else "Released"
        p_name = self.player.name if self.player else "Player"
        return f"{p_name}: {s_name} ➔ {b_name} ({self.price_usd} USD)"
