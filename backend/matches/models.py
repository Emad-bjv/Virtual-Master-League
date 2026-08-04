from django.db import models
from teams.models import Team, Player


class Tournament(models.Model):
    TYPES = [
        ('LEAGUE', 'لیگ'),
        ('CUP', 'جام حذفی'),
    ]

    name = models.CharField(max_length=100, verbose_name="نام تورنمنت")
    tournament_type = models.CharField(
        max_length=10, choices=TYPES, default='LEAGUE', verbose_name="نوع مسابقات"
    )
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
    date = models.DateTimeField(null=True, blank=True, verbose_name="تاریخ و ساعت برگزاری")
    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES,
        default='SCHEDULED', verbose_name="وضعیت بازی"
    )
    fatigue_applied = models.BooleanField(
        default=False, verbose_name="خستگی اعمال شده؟",
        help_text="آیا فرمول خستگی روی بازیکنان این مسابقه اعمال شده است؟"
    )

    # --- Cup / Bracket Fields ---
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, null=True, blank=True,
        related_name='matches', verbose_name="تورنمنت"
    )
    round_name = models.CharField(
        max_length=50, blank=True, verbose_name="مرحله/هفته",
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

    class Meta:
        verbose_name = "مسابقه"
        verbose_name_plural = "مسابقات"

    def __str__(self):
        h = self.home_team.name if self.home_team else "TBD"
        a = self.away_team.name if self.away_team else "TBD"
        return f"[{self.round_name}] {h} {self.home_score} - {self.away_score} {a}"


class MatchEvent(models.Model):
    EVENT_TYPES = [
        ('GOAL', 'گل'),
        ('ASSIST', 'پاس گل'),
        ('YELLOW', 'کارت زرد'),
        ('RED', 'کارت قرمز'),
        ('SUB_IN', 'تعویض (ورود)'),
        ('SUB_OUT', 'تعویض (خروج)'),
        ('INJURY', 'مصدومیت'),
    ]

    match = models.ForeignKey(
        Match, on_delete=models.CASCADE,
        related_name='events', verbose_name="مسابقه"
    )
    player = models.ForeignKey(
        Player, on_delete=models.CASCADE,
        related_name='match_events', verbose_name="بازیکن"
    )
    event_type = models.CharField(
        max_length=10, choices=EVENT_TYPES, verbose_name="نوع اتفاق"
    )
    minute = models.PositiveIntegerField(verbose_name="دقیقه")

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

