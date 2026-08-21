from django.db import models
from teams.models import Team


class Notification(models.Model):
    """
    In-app notification delivered to a team's inbox (or system-wide when team is null).

    System-wide notifications (team=None) are visible to every user; team
    notifications are only visible in that team's inbox.
    """

    CATEGORY_CHOICES = [
        ('MATCH', 'مسابقات'),
        ('TRANSFER', 'نقل و انتقالات'),
        ('GACHA', 'گاشا'),
        ('SYSTEM', 'سیستم'),
    ]

    TARGET_ROLE_CHOICES = [
        ('ALL', 'همه'),
        ('ADMIN', 'ادمین'),
        ('COACH', 'مربی'),
    ]

    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='notifications', verbose_name="تیم"
    )
    match = models.ForeignKey(
        'matches.Match', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='notifications', verbose_name="مسابقه"
    )
    target_role = models.CharField(
        max_length=10, choices=TARGET_ROLE_CHOICES,
        default='ALL', verbose_name="نقش مخاطب"
    )
    action_url = models.CharField(
        max_length=255, blank=True, default='',
        verbose_name="لینک اقدام"
    )
    category = models.CharField(
        max_length=15, choices=CATEGORY_CHOICES,
        default='SYSTEM', verbose_name="دسته‌بندی"
    )
    title = models.CharField(max_length=255, verbose_name="عنوان")
    message = models.TextField(blank=True, verbose_name="متن پیام")
    is_read = models.BooleanField(default=False, verbose_name="خوانده شده؟")
    is_dismissed = models.BooleanField(default=False, verbose_name="رد/بسته شده؟")
    dismissed_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان رد/بستن")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ایجاد")

    class Meta:
        verbose_name = "اعلامیه"
        verbose_name_plural = "اعلامیه‌ها"
        ordering = ['-created_at']

    def __str__(self):
        audience = self.team.name if self.team else f"نقش {self.get_target_role_display()}"
        return f"[{self.get_category_display()}] {audience}: {self.title}"
