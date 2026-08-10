from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class Team(models.Model):
    manager = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='team', verbose_name="مربی"
    )
    name = models.CharField(max_length=100, unique=True, verbose_name="نام تیم")
    logo = models.CharField(max_length=255, null=True, blank=True, verbose_name="لوگو")
    budget = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="بودجه")
    gems = models.PositiveIntegerField(default=0, verbose_name="جم (ارز ارتقا/گاچا)")
    wage_cap = models.DecimalField(max_digits=15, decimal_places=2, default=10000.00, verbose_name="سقف دستمزد")
    academy_level = models.PositiveIntegerField(default=1, verbose_name="سطح آکادمی")

    class Meta:
        verbose_name = "تیم"
        verbose_name_plural = "تیم‌ها"

    def __str__(self):
        return self.name


class ClubFacilities(models.Model):
    team = models.OneToOneField(Team, on_delete=models.CASCADE, related_name='facilities', null=True, blank=True)
    # Major Facilities (تسهیلات اصلی باشگاه)
    training_camp_level = models.PositiveIntegerField(default=1, verbose_name="سطح کمپ تمرینی")
    gym_level = models.PositiveIntegerField(default=1, verbose_name="سطح سالن بدنسازی")
    medical_level = models.PositiveIntegerField(default=1, verbose_name="سطح مرکز پزشکی")
    pool_level = models.PositiveIntegerField(default=1, verbose_name="سطح استخر بازیابی")
    stadium_level = models.PositiveIntegerField(default=1, verbose_name="سطح استادیوم")
    academy_level = models.PositiveIntegerField(default=1, verbose_name="سطح آکادمی جوانان")
    scouting_level = models.PositiveIntegerField(default=1, verbose_name="سطح استعدادیابی بین‌المللی")

    class Meta:
        verbose_name = "تسهیلات باشگاه"
        verbose_name_plural = "تسهیلات باشگاه‌ها"

    def __str__(self):
        return f"تسهیلات تیم {self.team.name}"

    @staticmethod
    def curve_percent(level: int) -> float:
        """Returns the percentage of the max effect for the given level (1-20)."""
        level = max(1, min(level, 20))
        CURVE = [
            0, 15, 27, 37, 46, 54, 61, 67, 71, 75,
            79, 83, 86, 89, 92, 94, 96, 98, 99, 100
        ]
        return CURVE[level - 1] / 100.0

    @staticmethod
    def scaled_effect(level: int, max_effect: float) -> float:
        """Calculates the absolute effect based on the level and the theoretical max effect."""
        return max_effect * ClubFacilities.curve_percent(level)


class Player(models.Model):
    POSITIONS = [
        ('GK', 'Goalkeeper'),
        ('CB', 'Center Back'),
        ('LB', 'Left Back'),
        ('RB', 'Right Back'),
        ('DMF', 'Defensive Midfielder'),
        ('CMF', 'Central Midfielder'),
        ('LMF', 'Left Midfielder'),
        ('RMF', 'Right Midfielder'),
        ('AMF', 'Attacking Midfielder'),
        ('LWF', 'Left Wing Forward'),
        ('RWF', 'Right Wing Forward'),
        ('SS', 'Second Striker'),
        ('CF', 'Center Forward'),
    ]

    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='players', verbose_name="تیم فعلی")
    name = models.CharField(max_length=100, verbose_name="نام بازیکن")
    age = models.PositiveIntegerField(verbose_name="سن")
    position = models.CharField(max_length=3, choices=POSITIONS, verbose_name="پست اصلی")
    overall = models.PositiveIntegerField(verbose_name="اورال (OVR)")
    potential_ovr = models.PositiveIntegerField(default=99, verbose_name="سقف پتانسیل (Potential OVR)")
    base_stamina = models.PositiveIntegerField(verbose_name="استقامت پایه PES", help_text="مقدار Stamina ability بازیکن در PES (0-99)")
    virtual_stamina = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="استقامت مجازی فعلی (%)",
        help_text="درصد استقامت فعلی بازیکن (0-100). زیر 30 = قفل شده."
    )
    is_injured = models.BooleanField(default=False, verbose_name="مصدوم است؟")
    injury_return_date = models.DateField(null=True, blank=True, verbose_name="تاریخ بازگشت از مصدومیت")
    consecutive_games = models.PositiveIntegerField(default=0, verbose_name="بازی‌های متوالی", help_text="تعداد بازی‌هایی که بازیکن بدون استراحت بازی کرده.")
    last_match_date = models.DateField(null=True, blank=True, verbose_name="تاریخ آخرین بازی")
    matches_benched_streak = models.PositiveIntegerField(default=0, verbose_name="تعداد بازی متوالی نیمکت‌نشین")
    suspension_matches = models.PositiveIntegerField(default=0, verbose_name="بازی‌های محرومیت")
    yellow_card_accumulator = models.PositiveIntegerField(default=0, verbose_name="کارت زرد تجمیعی")
    training_points = models.PositiveIntegerField(default=0, verbose_name="امتیاز تمرین")
    wage = models.DecimalField(max_digits=10, decimal_places=2, default=100.0, verbose_name="دستمزد")
    rarity = models.CharField(max_length=20, default='REGULAR', verbose_name="درجه کارت (Rarity)")
    growth_buffer = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('0.00'),
        verbose_name="بافر رشد",
        help_text="مانده کسری رشد که در هر دوره ارزیابی روی اورال اعمال می‌شود."
    )
    is_locked = models.BooleanField(default=False, verbose_name="قفل استقامت زیر ۳۰٪")
    x_coord = models.FloatField(default=0.0, verbose_name="مختصات X در ترکیب")
    y_coord = models.FloatField(default=0.0, verbose_name="مختصات Y در ترکیب")
    is_starting = models.BooleanField(default=False, verbose_name="فیکس است؟")

    class Meta:
        verbose_name = "بازیکن"
        verbose_name_plural = "بازیکنان"

    def __str__(self):
        return f"{self.name} ({self.position} - {self.overall})"

    @property
    def is_stamina_locked(self) -> bool:
        return self.is_locked or self.virtual_stamina < 30.0

    @property
    def stamina_status(self) -> str:
        if self.is_injured:
            return "مصدوم"
        if self.is_stamina_locked:
            return "قفل شده (خسته)"
        if self.virtual_stamina < 50.0:
            return "افت شدید"
        if self.virtual_stamina < 80.0:
            return "خستگی جزئی"
        return "کامل"

    @property
    def position_group(self) -> str:
        if self.position == 'GK':
            return 'GK'
        if self.position in ['CB']:
            return 'CB'
        if self.position in ['LB', 'RB']:
            return 'FB'
        if self.position in ['DMF', 'CMF']:
            return 'CMF'
        if self.position in ['AMF']:
            return 'AMF'
        if self.position in ['LWF', 'RWF', 'LMF', 'RMF']:
            return 'WING'
        if self.position in ['SS']:
            return 'SS'
        if self.position in ['CF']:
            return 'CF'
        return 'CMF'


class PlayerGrowthLog(models.Model):
    CHANGE_TYPES = [
        ('UPGRADE', 'ارتقا (رشد)'),
        ('DOWNGRADE', 'افت'),
        ('NO_CHANGE', 'بدون تغییر'),
    ]

    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='growth_logs', verbose_name="بازیکن")
    period_name = models.CharField(max_length=50, verbose_name="دوره ارزیابی", help_text="مثال: ارزیابی هفته ۶، ارزیابی نیم‌فصل")
    old_overall = models.PositiveIntegerField(verbose_name="اورال قبلی")
    new_overall = models.PositiveIntegerField(verbose_name="اورال جدید")
    change_amount = models.IntegerField(verbose_name="میزان تغییر", help_text="مثلاً +2 یا -1")
    change_type = models.CharField(max_length=10, choices=CHANGE_TYPES, verbose_name="نوع تغییر")
    avg_rating = models.DecimalField(max_digits=4, decimal_places=2, verbose_name="میانگین نمره عملکرد")
    games_played = models.PositiveIntegerField(verbose_name="تعداد بازی‌های ارزیابی‌شده")
    goals_scored = models.PositiveIntegerField(default=0, verbose_name="گل‌های زده در دوره")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت ارزیابی")
    notes = models.TextField(blank=True, verbose_name="توضیحات و علت تغییر")

    class Meta:
        verbose_name = "تاریخچه رشد/افت بازیکن"
        verbose_name_plural = "تاریخچه رشد و افت بازیکنان"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.player.name} - {self.period_name}: {self.old_overall} -> {self.new_overall}"


class TeamGamePlan(models.Model):
    team = models.OneToOneField(Team, on_delete=models.CASCADE, related_name='gameplan', verbose_name="تیم")
    formation = models.CharField(max_length=20, default='4-2-1-3', verbose_name="سیستم ترکیب")

    # حمله
    attacking_style = models.CharField(max_length=50, default='بازی مالکانه')
    build_up = models.CharField(max_length=50, default='پاس کوتاه')
    attacking_area = models.CharField(max_length=20, default='مرکز')
    positioning = models.CharField(max_length=20, default='حفظ ترکیب')
    support_range = models.PositiveIntegerField(default=7)

    # دفاع
    defensive_style = models.CharField(max_length=50, default='فشار خط مقدم')
    containment_area = models.CharField(max_length=20, default='میانه')
    pressing = models.CharField(max_length=20, default='تهاجمی')
    defensive_line = models.PositiveIntegerField(default=6)
    compactness = models.PositiveIntegerField(default=5)

    # پیشرفته
    adv_offense_1 = models.CharField(max_length=50, default='هیچکدام')
    adv_offense_2 = models.CharField(max_length=50, default='هیچکدام')
    adv_defense_1 = models.CharField(max_length=50, default='هیچکدام')
    adv_defense_2 = models.CharField(max_length=50, default='هیچکدام')

    is_submitted = models.BooleanField(default=False, verbose_name="تایید و ارسال شده به ادمین")
    submitted_at = models.DateTimeField(auto_now=True, verbose_name="زمان ثبت و ارسال")

    class Meta:
        verbose_name = "تاکتیک و ترکیب ارسال‌شده تیم"
        verbose_name_plural = "تاکتیک‌ها و ترکیب‌های ارسال‌شده تیم‌ها"

    def __str__(self):
        status = "ارسال شده" if self.is_submitted else "پیش‌نویس"
        return f"ترکیب {self.team.name} ({status})"