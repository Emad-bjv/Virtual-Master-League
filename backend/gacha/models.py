from django.db import models
from django.utils import timezone
from teams.models import Team, Player


class Pack(models.Model):
    TIER_CHOICES = [
        ('BRONZE', 'برنز'),
        ('SILVER', 'نقره'),
        ('LEGENDARY', 'لجندری'),
    ]

    PURCHASE_METHOD_CHOICES = [
        ('GEMS', 'فقط جم'),
        ('DIRECT', 'فقط پرداخت مستقیم / دلار'),
        ('BOTH', 'هر دو روش'),
    ]

    name = models.CharField(max_length=100, verbose_name="نام پک")
    tier = models.CharField(
        max_length=20, choices=TIER_CHOICES, default='BRONZE', verbose_name="سطح / تیر"
    )
    cover_image = models.ImageField(
        upload_to='packs/covers/', null=True, blank=True, verbose_name="تصویر کاور پک"
    )
    custom_card_bg = models.ImageField(
        upload_to='packs/card_bgs/', null=True, blank=True, verbose_name="پس‌زمینه اختصاصی کارت پک"
    )
    description = models.TextField(blank=True, default='', verbose_name="توضیحات پک")
    ovr_range_text = models.CharField(
        max_length=50, blank=True, default='', verbose_name="محدوده اورال (نمایشی)",
        help_text="مثال: OVR 85-90 یا بازیکنان منتخب هفته"
    )
    cost_usd = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00, verbose_name="قیمت به دلار مجازی"
    )
    cost_gems = models.PositiveIntegerField(default=0, verbose_name="قیمت به جم")
    cost_irr = models.PositiveIntegerField(
        default=0, verbose_name="قیمت به تومان (خرید مستقیم)"
    )
    purchase_method = models.CharField(
        max_length=10, choices=PURCHASE_METHOD_CHOICES, default='BOTH',
        verbose_name="روش خرید مجاز"
    )
    featured_team = models.CharField(
        max_length=100, blank=True, default='', verbose_name="تیم منتخب (پک لجندری/تیمی)",
        help_text="مثلاً: اسطوره‌های میلان یا آرسنال کلاسیک"
    )
    available_from = models.DateTimeField(
        null=True, blank=True, verbose_name="شروع در دسترس بودن"
    )
    available_until = models.DateTimeField(
        null=True, blank=True, verbose_name="پایان در دسترس بودن"
    )
    is_active = models.BooleanField(default=True, verbose_name="فعال است؟")
    sort_order = models.PositiveIntegerField(default=0, verbose_name="ترتیب نمایش")
    weight_top_tier = models.PositiveIntegerField(
        default=1, verbose_name="ضریب شانس کارت‌های ۹۴+ (Top Tier)",
        help_text="ضریب شانس ظاهر شدن فوق‌ستاره‌های اورال ۹۴ به بالا (پیش‌فرض: ۱)"
    )
    weight_mid_tier = models.PositiveIntegerField(
        default=4, verbose_name="ضریب شانس کارت‌های ۹۰-۹۳ (Mid Tier)",
        help_text="ضریب شانس ظاهر شدن اسطوره‌های اورال ۹۰ تا ۹۳ (پیش‌فرض: ۴)"
    )
    weight_base_tier = models.PositiveIntegerField(
        default=10, verbose_name="ضریب شانس کارت‌های زیر ۹۰ (Base Tier)",
        help_text="ضریب شانس ظاهر شدن بازیکنان اورال زیر ۹۰ (پیش‌فرض: ۱۰)"
    )
    guarantee_min_ovr = models.PositiveIntegerField(
        default=90, verbose_name="حداقل اورال اسلات تضمینی",
        help_text="حداقل اورال کارت اول در بین ۳ کارت شانس (مثلاً ۹۰، یا ۰ برای غیرفعال کردن تضمین)"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "پک بازیکنان"
        verbose_name_plural = "پک‌های بازیکنان"
        ordering = ['sort_order', '-id']

    def __str__(self):
        return f"{self.name} [{self.get_tier_display()}] - {self.cost_gems} GEMS"

    @property
    def total_players_count(self) -> int:
        return self.players.count()

    @property
    def unclaimed_players_count(self) -> int:
        return self.players.filter(is_claimed=False).count()

    @property
    def is_sold_out(self) -> bool:
        return self.unclaimed_players_count < 3

    @property
    def is_time_valid(self) -> bool:
        now = timezone.now()
        if self.available_from and now < self.available_from:
            return False
        if self.available_until and now > self.available_until:
            return False
        return True

    def get_odds_breakdown(self):
        """
        Calculates dynamic pack odds and probabilities based on remaining unclaimed players.
        """
        unclaimed = list(self.players.filter(is_claimed=False))
        if not unclaimed:
            return {
                'top_tier_pct': 0,
                'mid_tier_pct': 0,
                'base_tier_pct': 0,
                'top_tier_count': 0,
                'mid_tier_count': 0,
                'base_tier_count': 0,
                'guarantee_min_ovr': self.guarantee_min_ovr,
                'total_unclaimed': 0,
            }

        top_players = [p for p in unclaimed if p.overall >= 94]
        mid_players = [p for p in unclaimed if 90 <= p.overall < 94]
        base_players = [p for p in unclaimed if p.overall < 90]

        top_weight = sum(p.get_effective_weight() for p in top_players)
        mid_weight = sum(p.get_effective_weight() for p in mid_players)
        base_weight = sum(p.get_effective_weight() for p in base_players)
        total_weight = top_weight + mid_weight + base_weight

        if total_weight > 0:
            top_pct = round((top_weight / total_weight) * 100, 1)
            mid_pct = round((mid_weight / total_weight) * 100, 1)
            base_pct = round((base_weight / total_weight) * 100, 1)
        else:
            top_pct = mid_pct = base_pct = 0.0

        return {
            'top_tier_pct': top_pct,
            'mid_tier_pct': mid_pct,
            'base_tier_pct': base_pct,
            'top_tier_count': len(top_players),
            'mid_tier_count': len(mid_players),
            'base_tier_count': len(base_players),
            'guarantee_min_ovr': self.guarantee_min_ovr,
            'total_unclaimed': len(unclaimed),
        }


class PackPlayer(models.Model):
    pack = models.ForeignKey(
        Pack, on_delete=models.CASCADE, related_name='players', verbose_name="پک مربوطه"
    )
    name = models.CharField(max_length=100, verbose_name="نام بازیکن")
    position = models.CharField(
        max_length=3, choices=Player.POSITIONS, verbose_name="پست"
    )
    compatible_positions = models.CharField(
        max_length=100, blank=True, default='',
        verbose_name="پست‌های قابل بازی",
        help_text="لیست سایر پست‌های قابل بازی بازیکن جدا شده با کاما. مثال: RWF,LWF,SS"
    )
    overall = models.PositiveIntegerField(verbose_name="اورال (OVR)")
    potential_ovr = models.PositiveIntegerField(default=99, verbose_name="سقف پتانسیل")
    age = models.PositiveIntegerField(default=22, verbose_name="سن")
    base_stamina = models.PositiveIntegerField(default=80, verbose_name="استقامت پایه PES")
    drop_weight = models.PositiveIntegerField(
        default=0, verbose_name="ضریب شانس اختصاصی (Drop Weight)",
        help_text="ضریب شانس اختصاصی این کارت (پیش‌فرض: ۰ به معنی پیروی خودکار از رده پک)"
    )
    card_image = models.ImageField(
        upload_to='packs/players/', null=True, blank=True, verbose_name="تصویر کارت بازیکن"
    )
    nationality = models.CharField(
        max_length=100, blank=True, default='', verbose_name="ملیت بازیکن"
    )
    prime_club = models.CharField(
        max_length=100, blank=True, default='', verbose_name="باشگاه دوران پرایم"
    )
    club_logo = models.ImageField(
        upload_to='packs/clubs/', null=True, blank=True, verbose_name="لوگوی باشگاه دوران پرایم"
    )
    rarity = models.CharField(
        max_length=20, default='REGULAR', verbose_name="درجه کارت (Rarity)"
    )
    wage = models.DecimalField(
        max_digits=12, decimal_places=2, default=100.00, verbose_name="دستمزد"
    )
    market_value = models.DecimalField(
        max_digits=15, decimal_places=2, default=1000000.00, verbose_name="ارزش بازار (EUR)"
    )
    is_claimed = models.BooleanField(
        default=False, verbose_name="دریافت شده است؟"
    )
    claimed_by_team = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='claimed_pack_players', verbose_name="تیم دریافت کننده"
    )
    claimed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="زمان دریافت"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")

    class Meta:
        verbose_name = "بازیکن پک"
        verbose_name_plural = "بازیکنان پک‌ها"
        ordering = ['is_claimed', '-overall', 'name']

    def get_effective_weight(self) -> int:
        if self.drop_weight and self.drop_weight > 0:
            return self.drop_weight
        pack = self.pack
        if self.overall >= 94:
            return getattr(pack, 'weight_top_tier', 1) or 1
        elif self.overall >= 90:
            return getattr(pack, 'weight_mid_tier', 4) or 4
        else:
            return getattr(pack, 'weight_base_tier', 10) or 10

    def __str__(self):
        status = " (دریافت شده)" if self.is_claimed else " (موجود)"
        return f"{self.name} ({self.position} - {self.overall}) [{self.pack.name}]{status}"


class PackOpeningSession(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'در انتظار انتخاب'),
        ('COMPLETED', 'تکمیل شده'),
        ('EXPIRED', 'منقضی شده (برگشت وجه)'),
    ]

    team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name='pack_sessions', verbose_name="تیم"
    )
    pack = models.ForeignKey(
        Pack, on_delete=models.CASCADE, related_name='sessions', verbose_name="پک باز شده"
    )
    card_1 = models.ForeignKey(
        PackPlayer, on_delete=models.CASCADE, related_name='session_card1', verbose_name="کارت اول"
    )
    card_2 = models.ForeignKey(
        PackPlayer, on_delete=models.CASCADE, related_name='session_card2', verbose_name="کارت دوم"
    )
    card_3 = models.ForeignKey(
        PackPlayer, on_delete=models.CASCADE, related_name='session_card3', verbose_name="کارت سوم"
    )
    picked_card = models.ForeignKey(
        PackPlayer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='session_picked', verbose_name="کارت انتخاب شده"
    )
    created_player = models.ForeignKey(
        Player, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='from_pack_session', verbose_name="بازیکن ثبت شده در تیم"
    )
    payment_method = models.CharField(
        max_length=10, choices=[('GEMS', 'جم'), ('DIRECT', 'دلار مجازی/مستقیم')],
        default='GEMS', verbose_name="روش پرداخت"
    )
    cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00, verbose_name="مبلغ پرداختی"
    )
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default='PENDING', verbose_name="وضعیت سشن"
    )
    expires_at = models.DateTimeField(verbose_name="زمان انقضای سشن")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ایجاد")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان تکمیل")

    class Meta:
        verbose_name = "سشن باز کردن پک"
        verbose_name_plural = "سشن‌های باز کردن پک"
        ordering = ['-created_at']

    def __str__(self):
        return f"سشن #{self.id} - {self.team.name} - {self.pack.name} [{self.get_status_display()}]"

    @property
    def is_expired(self) -> bool:
        if self.status == 'EXPIRED':
            return True
        if self.status == 'PENDING' and timezone.now() > self.expires_at:
            return True
        return False
