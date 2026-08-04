from django.db import models
from teams.models import Team


class StorePackage(models.Model):
    name = models.CharField(max_length=100, verbose_name="نام بسته")
    usd_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        verbose_name="مبلغ دلار مجازی"
    )
    price_irr = models.PositiveIntegerField(
        verbose_name="قیمت به تومان",
        help_text="قیمت بسته به تومان (Toman) که در درگاه استفاده می‌شود."
    )
    is_active = models.BooleanField(
        default=True, verbose_name="فعال است؟"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "بسته فروشگاه"
        verbose_name_plural = "بسته‌های فروشگاه"

    def __str__(self):
        return f"{self.name} - {self.price_irr} Toman"


class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('DEPOSIT', 'واریز/خرید بسته'),
        ('WITHDRAW', 'برداشت/هزینه'),
        ('PRIZE', 'جایزه مسابقات'),
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
    amount_usd = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        verbose_name="مبلغ دلار مجازی"
    )
    amount_irr = models.PositiveIntegerField(
        default=0, verbose_name="مبلغ تراکنش به تومان",
        help_text="صفر برای تراکنش‌های غیر پرداختی"
    )
    transaction_type = models.CharField(
        max_length=15, choices=TRANSACTION_TYPES, verbose_name="نوع تراکنش"
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
        return f"[{self.status}] {self.team.name} | {self.amount_usd} USD"
