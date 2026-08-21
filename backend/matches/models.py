from django.db import models
from teams.models import Team, Player


class Season(models.Model):
    name = models.CharField(max_length=100, verbose_name="نام فصل")
    is_active = models.BooleanField(default=True, verbose_name="فعال است؟")
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="تاریخ شروع")
    ended_at = models.DateTimeField(null=True, blank=True, verbose_name="تاریخ پایان")

    class Meta:
        verbose_name = "فصل"
        verbose_name_plural = "فصل‌ها"

    def __str__(self):
        return self.name


class Tournament(models.Model):
    TYPES = [
        ('LEAGUE', 'لیگ'),
        ('CUP', 'جام حذفی'),
    ]

    name = models.CharField(max_length=100, verbose_name="نام تورنمنت")
    tournament_type = models.CharField(
        max_length=10, choices=TYPES, default='LEAGUE', verbose_name="نوع مسابقات"
    )
    season = models.ForeignKey(Season, on_delete=models.SET_NULL, null=True, blank=True, related_name="tournaments", verbose_name="فصل")
    is_active = models.BooleanField(default=True, verbose_name="فعال است؟")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "تورنمنت"
        verbose_name_plural = "تورنمنت‌ها"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_tournament_type_display()})"


class Match(models.Model):
    STATUS_CHOICES = [
        ('SCHEDULED', 'برنامه‌ریزی شده'),
        ('LIVE', 'در حال برگزاری'),
        ('FINISHED', 'پایان یافته'),
    ]
    HALF_STATUS_CHOICES = [
        ('NOT_STARTED', 'شروع نشده'),
        ('1ST_HALF', 'نیمه اول'),
        ('HALF_TIME', 'بین دو نیمه'),
        ('2ND_HALF', 'نیمه دوم'),
        ('EXTRA_TIME', 'وقت اضافه'),
        ('PENALTIES', 'ضربات پنالتی'),
        ('FINISHED', 'پایان بازی'),
    ]

    home_team = models.ForeignKey(
        Team, on_delete=models.CASCADE, null=True, blank=True,
        related_name='home_matches', verbose_name="تیم میزبان"
    )
    away_team = models.ForeignKey(
        Team, on_delete=models.CASCADE, null=True, blank=True,
        related_name='away_matches', verbose_name="تیم میهمان"
    )
    home_score = models.PositiveIntegerField(default=0, verbose_name="گل‌های میزبان")
    away_score = models.PositiveIntegerField(default=0, verbose_name="گل‌های میهمان")
    date = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name="تاریخ و ساعت برگزاری")
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES,
        default='SCHEDULED', db_index=True, verbose_name="وضعیت بازی"
    )
    half_status = models.CharField(
        max_length=15, choices=HALF_STATUS_CHOICES,
        default='NOT_STARTED', db_index=True, verbose_name="وضعیت نیمه"
    )
    fatigue_applied = models.BooleanField(
        default=False, verbose_name="خستگی اعمال شده؟",
        help_text="آیا فرمول خستگی روی بازیکنان این مسابقه اعمال شده است؟"
    )
    standings_processed = models.BooleanField(
        default=False, verbose_name="جدول پردازش شده؟",
        help_text="آیا این بازی در جدول رده‌بندی ثبت و محاسبه شده است؟"
    )

    # --- Cup / Bracket Fields ---
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, null=True, blank=True,
        related_name='matches', verbose_name="تورنمنت"
    )
    round_name = models.CharField(
        max_length=50, blank=True, db_index=True, verbose_name="مرحله/هفته",
        help_text="مثال: هفته ۱، یک‌چهارم نهایی"
    )
    is_knockout = models.BooleanField(
        default=False, verbose_name="مسابقه حذفی است؟"
    )
    home_penalties = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="پنالتی‌های میزبان"
    )
    away_penalties = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="پنالتی‌های میهمان"
    )
    next_match = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='previous_matches', verbose_name="بازی بعدی (براکت)"
    )
    importance_multiplier = models.FloatField(
        default=1.0, verbose_name="ضریب اهمیت بازی",
        help_text="ضریب اهمیت مسابقه (دربی، فینال و غیره)"
    )
    stoppage_time = models.PositiveIntegerField(
        default=0, verbose_name="وقت اضافه نیمه (دقیقه)"
    )
    current_minute = models.PositiveIntegerField(
        default=0, verbose_name="دقیقه فعلی بازی"
    )
    stream_url = models.URLField(
        max_length=500, blank=True, default='',
        verbose_name="لینک استریم زنده",
        help_text="لینک پخش زنده آپارات یا یوتیوب"
    )

    class Meta:
        verbose_name = "مسابقه"
        verbose_name_plural = "مسابقات"
        indexes = [
            models.Index(fields=['tournament', 'status']),
            models.Index(fields=['tournament', 'round_name']),
            models.Index(fields=['date', 'status']),
        ]

    def __str__(self):
        h = self.home_team.name if self.home_team else "TBD"
        a = self.away_team.name if self.away_team else "TBD"
        return f"[{self.round_name}] {h} {self.home_score} - {self.away_score} {a}"


class MatchEvent(models.Model):
    EVENT_TYPES = [
        ('GOAL', 'گل'),
        ('ASSIST', 'پاس گل'),
        ('OWN_GOAL', 'گل به خودی'),
        ('PENALTY_SCORED', 'گل از روی نقطه پنالتی'),
        ('PENALTY_MISSED', 'پنالتی از دست رفته'),
        ('YELLOW', 'کارت زرد'),
        ('SECOND_YELLOW', 'کارت زرد دوم -> قرمز'),
        ('RED', 'کارت قرمز مستقیم'),
        ('SUB_IN', 'تعویض (ورود)'),
        ('SUB_OUT', 'تعویض (خروج)'),
        ('INJURY', 'مصدومیت'),
        ('VAR', 'بررسی VAR'),
        ('UNDO_GOAL', 'لغو گل'),
        ('UNDO_EVENT', 'لغو رویداد'),
        ('INFO', 'پیام اطلاعاتی'),
    ]

    match = models.ForeignKey(
        Match, on_delete=models.CASCADE,
        related_name='events', verbose_name="مسابقه"
    )
    player = models.ForeignKey(
        Player, on_delete=models.CASCADE,
        related_name='match_events', verbose_name="بازیکن"
    )
    assist_player = models.ForeignKey(
        Player, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assisted_events', verbose_name="بازیکن پاسور"
    )
    team = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='match_events', verbose_name="تیم"
    )
    event_type = models.CharField(
        max_length=20, choices=EVENT_TYPES, verbose_name="نوع اتفاق"
    )
    minute = models.PositiveIntegerField(verbose_name="دقیقه")
    detail = models.CharField(
        max_length=255, blank=True, default='', verbose_name="توضیحات تکمیلی رویداد"
    )
    is_undone = models.BooleanField(
        default=False, verbose_name="باطل شده (Undo)"
    )

    class Meta:
        verbose_name = "اتفاق بازی"
        verbose_name_plural = "اتفاقات بازی"

    def __str__(self):
        return f"{self.get_event_type_display()} - {self.player.name} (دقیقه {self.minute})"


class PlayerMatchStat(models.Model):
    """
    Per-player stats for a specific match.
    Used by the admin to record minutes played and match rating.
    """
    match = models.ForeignKey(
        Match, on_delete=models.CASCADE,
        related_name='player_stats', verbose_name="مسابقه"
    )
    player = models.ForeignKey(
        Player, on_delete=models.CASCADE,
        related_name='match_stats', verbose_name="بازیکن"
    )
    minutes_played = models.PositiveIntegerField(
        default=0, verbose_name="دقایق بازی",
        help_text="تعداد دقایقی که بازیکن در زمین بوده (0-90)"
    )
    rating = models.DecimalField(
        max_digits=3, decimal_places=1, null=True, blank=True,
        verbose_name="نمره بازیکن (0-10)",
        help_text="نمره عملکرد بازیکن در این مسابقه (برای محاسبه رشد/افت)"
    )
    was_starter = models.BooleanField(
        default=False, verbose_name="بازیکن اصلی بود؟"
    )

    class Meta:
        verbose_name = "آمار بازیکن در مسابقه"
        verbose_name_plural = "آمار بازیکنان در مسابقات"
        unique_together = ('match', 'player')

    def __str__(self):
        return f"{self.player.name} in {self.match} — {self.minutes_played}min, rating={self.rating}"


class LiveSubstitutionRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'در انتظار بررسی ادمین'),
        ('APPLIED', 'اعمال شده در بازی'),
        ('REJECTED', 'رد شده (غیرمجاز)'),
    ]

    match = models.ForeignKey(
        Match, on_delete=models.CASCADE,
        related_name='substitution_requests', verbose_name="مسابقه"
    )
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='substitution_requests', verbose_name="تیم"
    )
    player_out = models.ForeignKey(
        Player, on_delete=models.CASCADE,
        related_name='sub_out_requests', verbose_name="بازیکن خروجی"
    )
    player_in = models.ForeignKey(
        Player, on_delete=models.CASCADE,
        related_name='sub_in_requests', verbose_name="بازیکن ورودی"
    )
    minute = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="دقیقه درخواستی"
    )
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES,
        default='PENDING', verbose_name="وضعیت درخواست"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت درخواست")

    class Meta:
        verbose_name = "درخواست تعویض زنده"
        verbose_name_plural = "درخواست‌های تعویض زنده"
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_status_display()}] {self.team.name}: {self.player_out.name} OUT, {self.player_in.name} IN (Min {self.minute})"


class LiveInGameChangeRequest(models.Model):
    CATEGORY_CHOICES = [
        ('SUBSTITUTION', 'تعویض بازیکن'),
        ('POSITION', 'جابجایی و تغییر پست'),
        ('TACTIC', 'تغییر تاکتیک'),
        ('FORMATION', 'تغییر سیستم بازی'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'در انتظار بررسی داور'),
        ('APPLIED', 'تایید و اعمال شده ✓'),
        ('REJECTED', 'رد شده ✗'),
    ]

    match = models.ForeignKey(
        Match, on_delete=models.CASCADE,
        related_name='in_game_changes', verbose_name="مسابقه"
    )
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='in_game_changes', verbose_name="تیم"
    )
    coach = models.ForeignKey(
        'users.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='submitted_in_game_changes', verbose_name="سرمربی"
    )
    change_category = models.CharField(
        max_length=20, choices=CATEGORY_CHOICES, default='TACTIC', verbose_name="دسته‌بندی تغییر"
    )
    title = models.CharField(max_length=150, verbose_name="عنوان تغییر")
    detail = models.TextField(verbose_name="جزئیات تغییر")
    diff_data = models.JSONField(default=dict, blank=True, verbose_name="داده‌های تفاوت (Payload)")
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default='PENDING', verbose_name="وضعیت درخواست"
    )
    minute = models.PositiveIntegerField(null=True, blank=True, verbose_name="دقیقه ثبت")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")
    applied_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان اعمال داور")

    class Meta:
        verbose_name = "تغییر حین بازی مربی"
        verbose_name_plural = "تغییرات حین بازی مربیان"
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_change_category_display()}] {self.team.name} - {self.title} ({self.status})"


class MatchTeamStat(models.Model):
    """
    Per-team aggregate stats for a specific match (possession, shots, etc).
    Recorded by admin after the match finishes.
    """
    match = models.ForeignKey(
        Match, on_delete=models.CASCADE,
        related_name='team_stats', verbose_name="مسابقه"
    )
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='team_match_stats', verbose_name="تیم"
    )
    possession_percent = models.PositiveIntegerField(
        default=50, verbose_name="تسلط بر توپ (%)"
    )
    shots = models.PositiveIntegerField(default=0, verbose_name="ضربات")
    shots_on_target = models.PositiveIntegerField(default=0, verbose_name="ضربات به هدف")
    corners = models.PositiveIntegerField(default=0, verbose_name="کرنر")
    fouls = models.PositiveIntegerField(default=0, verbose_name="خطا")
    offsides = models.PositiveIntegerField(default=0, verbose_name="آفساید")
    saves = models.PositiveIntegerField(default=0, verbose_name="مهارها (سیو دروازه‌بان)")

    class Meta:
        verbose_name = "آمار تیمی مسابقه"
        verbose_name_plural = "آمارهای تیمی مسابقات"
        unique_together = ('match', 'team')

    def __str__(self):
        return f"{self.team.name} stats in {self.match}"


class LeagueStanding(models.Model):
    """
    Persisted league standings per tournament, updated by signals.
    Replaces the old live-calculation approach.
    """
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE,
        related_name='standings', verbose_name="تورنمنت"
    )
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='league_standings', verbose_name="تیم"
    )
    played = models.PositiveIntegerField(default=0, verbose_name="بازی‌کرده")
    won = models.PositiveIntegerField(default=0, verbose_name="برد")
    drawn = models.PositiveIntegerField(default=0, verbose_name="مساوی")
    lost = models.PositiveIntegerField(default=0, verbose_name="باخت")
    goals_for = models.PositiveIntegerField(default=0, verbose_name="گل زده")
    goals_against = models.PositiveIntegerField(default=0, verbose_name="گل خورده")
    points = models.PositiveIntegerField(default=0, verbose_name="امتیاز")

    class Meta:
        verbose_name = "جدول لیگ"
        verbose_name_plural = "جداول لیگ"
        unique_together = ('tournament', 'team')
        ordering = ['-points', '-goals_for']

    @property
    def goal_difference(self):
        return self.goals_for - self.goals_against

    def __str__(self):
        return f"{self.tournament.name} — {self.team.name}: {self.points}pts"


class MatchGamePlan(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='gameplans', verbose_name="مسابقه")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='match_gameplans', verbose_name="تیم")
    formation = models.CharField(max_length=20, default='4-3-3', verbose_name="سیستم ترکیب")

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

    is_submitted = models.BooleanField(default=False, db_index=True, verbose_name="تایید و ارسال شده برای این مسابقه")
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان ثبت و ارسال")
    players_data = models.JSONField(default=list, blank=True, verbose_name="چیدمان بازیکنان در این مسابقه")

    class Meta:
        verbose_name = "ترکیب و تاکتیک مسابقه"
        verbose_name_plural = "ترکیب‌ها و تاکتیک‌های مسابقات"
        unique_together = ('match', 'team')
        indexes = [
            models.Index(fields=['match', 'team', 'is_submitted']),
        ]

    def __str__(self):
        status = "ارسال شده" if self.is_submitted else "پیش‌نویس"
        return f"ترکیب {self.team.name} برای بازی {self.match_id} ({status})"

