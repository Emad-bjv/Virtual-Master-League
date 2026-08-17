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


class TransferOffer(models.Model):
    OFFER_TYPES = [
        ('DIRECT_TRANSFER', 'خرید قطعی'),
        ('SWAP', 'معاوضه'),
        ('LOAN', 'قرضی'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'در انتظار بررسی'),
        ('ACCEPTED', 'قبول شده'),
        ('REJECTED', 'رد شده'),
        ('COUNTERED', 'پیشنهاد متقابل'),
        ('CANCELLED', 'لغو شده'),
    ]

    sender_team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='sent_offers', verbose_name="تیم پیشنهاد دهنده"
    )
    receiver_team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='received_offers', verbose_name="تیم دریافت کننده"
    )
    target_player = models.ForeignKey(
        Player, on_delete=models.CASCADE,
        related_name='received_offers', verbose_name="بازیکن هدف"
    )
    offer_type = models.CharField(
        max_length=20, choices=OFFER_TYPES, default='DIRECT_TRANSFER', verbose_name="نوع پیشنهاد"
    )
    cash_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00, verbose_name="مبلغ نقدی (USD)"
    )
    swap_players = models.ManyToManyField(
        Player, blank=True, related_name='swap_offers_involved', verbose_name="بازیکنان پیشنهادی برای معاوضه"
    )
    loan_duration_matches = models.PositiveIntegerField(
        default=0, verbose_name="مدت قرارداد قرضی (تعداد بازی)"
    )
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default='PENDING', verbose_name="وضعیت"
    )
    parent_offer = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='counter_offers', verbose_name="پیشنهاد مرجع (برای مذاکره متقابل)"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت پیشنهاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="زمان آخرین تغییر")

    class Meta:
        verbose_name = "پیشنهاد نقل و انتقال"
        verbose_name_plural = "پیشنهادهای نقل و انتقالات"
        ordering = ['-created_at']

    def __str__(self):
        return f"Offer from {self.sender_team.name} to {self.receiver_team.name} for {self.target_player.name}"


class TransferLog(models.Model):
    EVENT_TYPES = [
        ('OFFER_MADE', 'ثبت پیشنهاد اولیه'),
        ('COUNTER_OFFER', 'پیشنهاد متقابل'),
        ('OFFER_REJECTED', 'رد پیشنهاد'),
        ('TRANSFER_FINALIZED', 'تکمیل انتقال'),
        ('PLAYER_RELEASED', 'فسخ قرارداد بازیکن'),
    ]

    event_type = models.CharField(max_length=30, choices=EVENT_TYPES, verbose_name="نوع رویداد")
    description = models.TextField(verbose_name="شرح رویداد")
    related_offer = models.ForeignKey(
        TransferOffer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='logs', verbose_name="پیشنهاد مرتبط"
    )
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="زمان رویداد")

    class Meta:
        verbose_name = "لاگ نقل و انتقال"
        verbose_name_plural = "لاگ‌های نقل و انتقالات"
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.get_event_type_display()}] {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
