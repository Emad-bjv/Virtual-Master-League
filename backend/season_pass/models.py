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
    """تعریف جدول پاداش هر سطح — یک بار توسط ادمین ست می‌شود."""
    level = models.PositiveIntegerField(unique=True)
    xp_required = models.PositiveIntegerField()
    free_reward_gems = models.PositiveIntegerField(default=0)
    vip_reward_gems = models.PositiveIntegerField(default=0)
    vip_reward_player_rarity = models.CharField(max_length=20, blank=True)  # فقط سطح آخر: 'LEGENDARY'
    is_final_level = models.BooleanField(default=False)
    
    def __str__(self):
        return f"Level {self.level} ({self.xp_required} XP)"


class TeamSeasonPass(models.Model):
    team = models.OneToOneField(Team, on_delete=models.CASCADE, related_name='season_pass')
    current_xp = models.PositiveIntegerField(default=0)
    current_level = models.PositiveIntegerField(default=1)
    is_vip = models.BooleanField(default=False)
    claimed_levels = models.JSONField(default=list)

    def __str__(self):
        return f"{self.team.name} - Level {self.current_level} (VIP: {self.is_vip})"
