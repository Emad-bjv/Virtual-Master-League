from django.db import models
from teams.models import Team

class WeeklyTask(models.Model):
    TASK_TYPES = [
        ('WIN_MATCHES', 'برد در N بازی'),
        ('SCORE_GOALS', 'گلزنی'),
        ('SUBMIT_LINEUP', 'ثبت ترکیب به‌موقع'),
        ('OPEN_PACKS', 'باز کردن پک'),
        ('CLEAN_SHEETS', 'کلین‌شیت'),
    ]
    title = models.CharField(max_length=100, verbose_name="عنوان تسک")
    task_type = models.CharField(max_length=20, choices=TASK_TYPES)
    target_value = models.PositiveIntegerField(verbose_name="هدف عددی")
    reward_xp = models.PositiveIntegerField(default=50, verbose_name="امتیاز XP پاس فصلی")
    week_number = models.PositiveIntegerField(verbose_name="شماره هفته فعال‌بودن")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "تسک هفتگی"

    def __str__(self):
        return f"{self.title} (هفته {self.week_number})"


class TeamTaskProgress(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='task_progress')
    task = models.ForeignKey(WeeklyTask, on_delete=models.CASCADE)
    current_value = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    is_claimed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('team', 'task')

    def __str__(self):
        return f"{self.team.name} - {self.task.title}: {self.current_value}/{self.task.target_value}"


class SeasonPassLevel(models.Model):
    """تعریف جدول پاداش هر سطح — پاداش‌ها شامل دلار، جم و در سطح آخر بازیکن لجند اختصاصی است."""
    level = models.PositiveIntegerField(unique=True, verbose_name="شماره سطح")
    xp_required = models.PositiveIntegerField(verbose_name="XP مورد نیاز")
    reward_title = models.CharField(max_length=150, blank=True, default="", verbose_name="عنوان پاداش")
    free_reward_coins = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="پاداش دلاری رایگان")
    free_reward_gems = models.PositiveIntegerField(default=0, verbose_name="پاداش جم رایگان")
    vip_reward_coins = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="پاداش دلاری VIP")
    vip_reward_gems = models.PositiveIntegerField(default=0, verbose_name="پاداش جم VIP")
    vip_reward_player_rarity = models.CharField(max_length=20, blank=True, default="")  # فقط سطح آخر: 'LEGENDARY'
    is_final_level = models.BooleanField(default=False, verbose_name="سطح نهایی (پاداش لجند)")
    
    class Meta:
        verbose_name = "سطح سیزن پس"
        verbose_name_plural = "سطوح سیزن پس"
        ordering = ['level']

    def __str__(self):
        return f"Level {self.level} ({self.xp_required} XP) - {self.reward_title or 'Reward'}"


class TeamSeasonPass(models.Model):
    team = models.OneToOneField(Team, on_delete=models.CASCADE, related_name='season_pass', verbose_name="تیم")
    current_xp = models.PositiveIntegerField(default=0, verbose_name="XP فعلی")
    current_level = models.PositiveIntegerField(default=1, verbose_name="سطح فعلی")
    is_vip = models.BooleanField(default=False, verbose_name="عضویت VIP")
    claimed_levels = models.JSONField(default=list, verbose_name="سطوح دریافت شده")
    assigned_legend_player = models.ForeignKey(
        'teams.Player', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='season_pass_assigned_team', verbose_name="بازیکن لجند اختصاصی تیم"
    )
    legend_claimed = models.BooleanField(default=False, verbose_name="لجند دریافت شده است؟")

    class Meta:
        verbose_name = "سیزن پس تیم"
        verbose_name_plural = "سیزن پس تیم‌ها"

    def __str__(self):
        leg_name = self.assigned_legend_player.name if self.assigned_legend_player else "بدون لجند"
        return f"{self.team.name} - Level {self.current_level} (XP: {self.current_xp}) | Legend: {leg_name}"
