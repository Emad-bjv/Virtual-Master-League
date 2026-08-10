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

    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='notifications', verbose_name="تیم"
    )
    category = models.CharField(
        max_length=15, choices=CATEGORY_CHOICES,
        default='SYSTEM', verbose_name="دسته‌بندی"
    )
    title = models.CharField(max_length=255, verbose_name="عنوان")
    message = models.TextField(blank=True, verbose_name="متن پیام")
    is_read = models.BooleanField(default=False, verbose_name="خوانده شده؟")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ایجاد")

    class Meta:
        verbose_name = "اعلامیه"
        verbose_name_plural = "اعلامیه‌ها"
        ordering = ['-created_at']

    def __str__(self):
        audience = self.team.name if self.team else "همه"
        return f"[{self.get_category_display()}] {audience}: {self.title}"
