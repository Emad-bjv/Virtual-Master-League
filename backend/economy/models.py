from django.db import models
from teams.models import Team


class StorePackage(models.Model):
    CURRENCY_CHOICES = [
        ('BUDGET', 'دلار مجازی'),
        ('GEMS', 'الماس / جم')
    ]
    name = models.CharField(max_length=100, verbose_name="نام بسته")
    currency_type = models.CharField(
        max_length=10, choices=CURRENCY_CHOICES, default='GEMS',
        verbose_name="نوع ارز اعطایی"
    )
    reward_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        verbose_name="مقدار ارز اعطایی"
    )
    usd_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        verbose_name="مبلغ دلار مجازی (سازگاری)"
    )
    price_irr = models.PositiveIntegerField(
        verbose_name="قیمت به تومان",
        help_text="قیمت بسته به تومان (Toman) که در درگاه استفاده می‌شود."
    )
    is_active = models.BooleanField(
        default=True, verbose_name="فعال است؟"
    )
    BADGE_CHOICES = [
        ('', 'بدون برچسب'),
        ('HOT_DEAL', 'پیشنهاد شگفت‌انگیز 🔥'),
        ('BEST_SELLER', 'پرفروش‌ترین ⭐'),
        ('SPECIAL', 'ویژه 💎'),
        ('BEST_VALUE', 'ارزش خرید بالا ⚡'),
        ('LIMITED', 'تخفیف محدود ⏳'),
        ('POPULAR', 'محبوب مربیان 🚀'),
    ]

    description = models.TextField(
        blank=True, default='', verbose_name="توضیحات بسته"
    )
    icon_code = models.CharField(
        max_length=50, blank=True, default='', verbose_name="کد آیکن یا تم"
    )
    badge_tag = models.CharField(
        max_length=50, blank=True, default='', choices=BADGE_CHOICES,
        verbose_name="برچسب رنگی بسته"
    )
    bonus_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        verbose_name="مقدار بونوس هدیه"
    )
    sort_order = models.PositiveIntegerField(
        default=0, verbose_name="ترتیب نمایش"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "بسته فروشگاه"
        verbose_name_plural = "بسته‌های فروشگاه"
        ordering = ['sort_order', 'id']

    def save(self, *args, **kwargs):
        if self.reward_amount == 0 and self.usd_amount > 0:
            self.reward_amount = self.usd_amount
        elif self.currency_type == 'BUDGET':
            self.usd_amount = self.reward_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.get_currency_type_display()}) - {self.price_irr} Toman"


class Transaction(models.Model):
    CURRENCY_CHOICES = [
        ('BUDGET', 'بودجه باشگاه'),
        ('GEMS', 'جم')
    ]
    
    TRANSACTION_TYPES = [
        ('MATCH_REWARD', 'پاداش بازی'),
        ('TRANSFER_BUY', 'خرید بازیکن'),
        ('TRANSFER_SELL', 'فروش بازیکن'),
        ('FACILITY_UPGRADE', 'ارتقای تسهیلات'),
        ('WAGE', 'پرداخت دستمزد'),
        ('STORE_PURCHASE', 'خرید بسته (پرداخت واقعی)'),
        ('GACHA_OPEN', 'باز کردن پک'),
        ('SEASON_PASS_REWARD', 'پاداش سیزن‌پس'),
        ('ADMIN_ADJUST', 'تنظیم دستی ادمین'),
        ('STAMINA_RECOVERY', 'ریکاوری استقامت بازیکن'),
        ('INJURY_HEAL', 'درمان فوری مصدومیت'),
        ('UNDERDOG_BONUS', 'پاداش شگفتی‌سازی مسابقه'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'در انتظار پرداخت'),
        ('SUCCESS', 'موفق'),
        ('FAILED', 'ناموفق/لغو شده'),
    ]

    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='transactions', verbose_name="تیم"
    )
    currency = models.CharField(
        max_length=10, choices=CURRENCY_CHOICES, default='BUDGET', verbose_name="ارز"
    )
    amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        verbose_name="مبلغ تراکنش"
    )
    amount_irr = models.PositiveIntegerField(
        default=0, verbose_name="مبلغ تراکنش به تومان",
        help_text="صفر برای تراکنش‌های غیر پرداختی"
    )
    transaction_type = models.CharField(
        max_length=25, choices=TRANSACTION_TYPES, verbose_name="نوع تراکنش"
    )
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default='PENDING', verbose_name="وضعیت"
    )
    
    # ZarinPal Tracking fields
    zarinpal_authority = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="Authority زرین‌پال"
    )
    zarinpal_ref_id = models.CharField(
        max_length=100, null=True, blank=True, verbose_name="کد پیگیری زرین‌پال (RefID)"
    )
    
    description = models.TextField(blank=True, verbose_name="توضیحات تراکنش")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "تراکنش مالی"
        verbose_name_plural = "تراکنش‌های مالی"
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.status}] {self.team.name} | {self.amount} {self.currency}"


class CardToCardSettings(models.Model):
    """
    Admin-configurable bank card details shown to users for card-to-card payments.
    Only one active instance should exist at a time.
    """
    card_number = models.CharField(
        max_length=19, verbose_name="شماره کارت",
        help_text="شماره کارت بانکی (مثال: 6037-9971-1234-5678)"
    )
    card_holder_name = models.CharField(
        max_length=100, verbose_name="نام صاحب حساب"
    )
    bank_name = models.CharField(
        max_length=50, blank=True, default='', verbose_name="نام بانک"
    )
    is_active = models.BooleanField(default=True, verbose_name="فعال است؟")

    class Meta:
        verbose_name = "تنظیمات کارت بانکی"
        verbose_name_plural = "تنظیمات کارت بانکی"

    def __str__(self):
        return f"{self.card_holder_name} - {self.card_number}"


class PaymentRequest(models.Model):
    """
    Card-to-card payment request flow:
    1. User selects a StorePackage
    2. System shows admin's bank card number
    3. User transfers money and uploads receipt screenshot
    4. Admin reviews and approves/rejects
    5. On approval, virtual dollars are credited to the team
    """
    STATUS_CHOICES = [
        ('AWAITING_RECEIPT', 'در انتظار آپلود رسید'),
        ('PENDING_REVIEW', 'در انتظار بررسی ادمین'),
        ('APPROVED', 'تایید شده'),
        ('REJECTED', 'رد شده'),
    ]

    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='payment_requests', verbose_name="تیم"
    )
    package = models.ForeignKey(
        StorePackage, on_delete=models.SET_NULL, null=True,
        related_name='payment_requests', verbose_name="بسته انتخابی"
    )
    amount_irr = models.PositiveIntegerField(verbose_name="مبلغ به تومان")
    currency_type = models.CharField(
        max_length=10, choices=StorePackage.CURRENCY_CHOICES, default='GEMS',
        verbose_name="نوع ارز"
    )
    reward_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        verbose_name="مقدار ارز اعطایی"
    )
    bonus_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        verbose_name="مقدار بونوس هدیه"
    )
    usd_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00, verbose_name="دلار مجازی (سازگاری)"
    )
    receipt_image = models.ImageField(
        upload_to='receipts/%Y/%m/', blank=True, null=True,
        verbose_name="تصویر رسید"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES,
        default='AWAITING_RECEIPT', verbose_name="وضعیت"
    )
    admin_note = models.TextField(
        blank=True, default='', verbose_name="یادداشت ادمین"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    reviewed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="تاریخ بررسی"
    )

    class Meta:
        verbose_name = "درخواست پرداخت کارت به کارت"
        verbose_name_plural = "درخواست‌های پرداخت کارت به کارت"
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_status_display()}] {self.team.name} - {self.amount_irr} تومان"
