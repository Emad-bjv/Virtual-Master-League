from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal

class GlobalSettings(models.Model):
    # Branding & System
    site_title = models.CharField(max_length=150, default="Virtual Master League", verbose_name="عنوان سایت")
    maintenance_mode = models.BooleanField(default=False, verbose_name="حالت تعمیرات")
    current_season = models.PositiveIntegerField(default=1, verbose_name="فصل جاری")
    current_week = models.PositiveIntegerField(default=1, verbose_name="هفته جاری")
    is_transfer_window_open = models.BooleanField(default=False, verbose_name="پنجره نقل و انتقالات باز است؟")

    # Feature Flags (9 Switches)
    feature_transfer_market = models.BooleanField(
        default=True, verbose_name="بازار نقل و انتقالات", 
        help_text="فعال/غیرفعال کردن تب بازار نقل‌وانتقالات در اپلیکیشن."
    )
    feature_store = models.BooleanField(
        default=True, verbose_name="فروشگاه و بسته‌ها", 
        help_text="فعال/غیرفعال کردن تب فروشگاه و خریدهای درون‌برنامه‌ای."
    )
    feature_gacha = models.BooleanField(
        default=True, verbose_name="سیستم گاچا / بسته‌های شانس", 
        help_text="فعال/غیرفعال کردن باز کردن پک‌های شانس بازیکنان."
    )
    feature_live_broadcast = models.BooleanField(
        default=True, verbose_name="پخش زنده مسابقات", 
        help_text="فعال/غیرفعال کردن تب پخش زنده مسابقات."
    )
    feature_season_pass = models.BooleanField(
        default=True, verbose_name="سیزن پس (پاس فصلی)", 
        help_text="فعال/غیرفعال کردن سیستم سیزن پس و تسک‌های هفتگی."
    )
    feature_notifications = models.BooleanField(
        default=True, verbose_name="سیستم اطلاع‌رسانی", 
        help_text="فعال/غیرفعال کردن ارسال نوتیفیکیشن‌ها به کاربران."
    )
    feature_registration = models.BooleanField(
        default=True, verbose_name="ثبت‌نام مربیان جدید", 
        help_text="فعال/غیرفعال کردن فرم ثبت‌نام و عضویت مربی جدید."
    )
    feature_club_facilities = models.BooleanField(
        default=True, verbose_name="امکانات و تسهیلات باشگاه", 
        help_text="فعال/غیرفعال کردن بخش تسهیلات و ارتقای باشگاه."
    )
    feature_game_plan = models.BooleanField(
        default=True, verbose_name="ارسال ترکیب و تاکتیک", 
        help_text="فعال/غیرفعال کردن قابلیت ارسال ترکیب توسط مربیان."
    )

    # Economy Settings
    default_team_budget = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('30000000.00'), 
        verbose_name="بودجه پیش‌فرض تیم‌ها", 
        help_text="مقدار بودجه‌ای که هنگام ریست بودجه یا ایجاد تیم جدید اعمال می‌شود."
    )
    max_team_budget = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('999000000.00'), 
        verbose_name="سقف بودجه تیم", 
        help_text="حداکثر بودجه‌ای که یک تیم می‌تواند در خزانه خود داشته باشد."
    )
    default_wage_cap = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('10000.00'), 
        verbose_name="سقف دستمزد پیش‌فرض", 
        help_text="حداکثر دستمزد هفتگی قابل پرداخت توسط هر تیم."
    )

    # Market Settings
    max_player_price = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('50000000.00'), 
        verbose_name="سقف قیمت فروش بازیکن", 
        help_text="حداکثر قیمتی که مربی می‌تواند بازیکنش را در بازار لیست کند."
    )
    max_bid_count = models.PositiveIntegerField(
        default=10, verbose_name="حداکثر تعداد پیشنهاد فعال", 
        help_text="تعداد حداکثری پیشنهادهای فعال همزمان برای هر تیم."
    )
    listing_duration_hours = models.PositiveIntegerField(
        default=48, verbose_name="مدت زمان لیستینگ (ساعت)", 
        help_text="هر لیستینگ بازیکن بعد از این مدت (ساعت) خودکار منقضی می‌شود."
    )

    # Match Settings
    half_duration_minutes = models.PositiveIntegerField(
        default=45, verbose_name="مدت هر نیمه بازی (دقیقه)", 
        help_text="زمان رسمی هر نیمه در سیستم پخش زنده."
    )
    max_substitutions = models.PositiveIntegerField(
        default=5, verbose_name="حداکثر تعویض هر تیم", 
        help_text="تعداد تعویض مجاز برای هر تیم در طول بازی."
    )
    pre_match_alert_minutes = models.PositiveIntegerField(
        default=15, verbose_name="اخطار قبل از بازی (دقیقه)", 
        help_text="چند دقیقه قبل از بازی، هشدار آماده‌سازی ترکیب ارسال شود."
    )

    # Gacha Settings
    gacha_rate_rare = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('70.00'), 
        verbose_name="شانس دراپ Rare (%)", 
        help_text="درصد احتمال دریافت بازیکن Rare (OVR 70-79)."
    )
    gacha_rate_epic = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('25.00'), 
        verbose_name="شانس دراپ Epic (%)", 
        help_text="درصد احتمال دریافت بازیکن Epic (OVR 80-86)."
    )
    gacha_rate_legendary = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('5.00'), 
        verbose_name="شانس دراپ Legendary (%)", 
        help_text="درصد احتمال دریافت بازیکن Legendary (OVR 87+)."
    )
    gacha_pity_threshold = models.PositiveIntegerField(
        default=12, verbose_name="آستانه Pity (تضمین لجندری)", 
        help_text="تعداد پک بدون Legendary برای تضمین دریافت Legendary."
    )
    gacha_pack_price_gems = models.PositiveIntegerField(
        default=500, verbose_name="قیمت هر پک با جم", 
        help_text="تعداد جمی که برای باز کردن یک پک گاچا لازم است."
    )

    # Season Pass Settings
    season_pass_xp_per_level = models.PositiveIntegerField(
        default=100, verbose_name="XP مورد نیاز هر سطح", 
        help_text="مقدار XP پایه‌ای برای رسیدن به هر سطح جدید."
    )
    season_pass_premium_price_gems = models.PositiveIntegerField(
        default=1000, verbose_name="قیمت VIP سیزن پس", 
        help_text="تعداد جم لازم برای خرید نسخه VIP سیزن پس."
    )

    # Facility Settings
    facility_max_level = models.PositiveIntegerField(
        default=20, verbose_name="حداکثر سطح امکانات", 
        help_text="سقف لول قابل دسترسی برای هر تسهیلات باشگاه."
    )
    facility_upgrade_cost_multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=Decimal('1.50'), 
        verbose_name="ضریب هزینه ارتقا", 
        help_text="ضریبی که بر هزینه پایه هر ارتقا اعمال می‌شود."
    )
    facility_bonus_multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=Decimal('1.00'), 
        verbose_name="ضریب بونوس امکانات", 
        help_text="ضریبی که بر تأثیر (بونوس) هر امکانات اعمال می‌شود."
    )

    class Meta:
        verbose_name = "تنظیمات سراسری"
        verbose_name_plural = "تنظیمات سراسری"

    def clean(self):
        super().clean()
        # Validate gacha rates sum
        rates_sum = (self.gacha_rate_rare or 0) + (self.gacha_rate_epic or 0) + (self.gacha_rate_legendary or 0)
        if abs(rates_sum - Decimal('100.00')) > Decimal('0.01'):
            raise ValidationError({'gacha_rate_rare': f"مجموع شانس‌های گاچا باید دقیقاً ۱۰۰٪ باشد. (مجموع فعلی: {rates_sum}%)"})

    def save(self, *args, **kwargs):
        if not self.pk and GlobalSettings.objects.exists():
            raise ValidationError('Only one instance of GlobalSettings can be created.')
        self.clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.site_title} - تنظیمات سراسری"

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
