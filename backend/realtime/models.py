from django.db import models

class AdminNotification(models.Model):
    message = models.JSONField(verbose_name='پیام')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    is_read = models.BooleanField(default=False, verbose_name='خوانده شده')

    class Meta:
        verbose_name = 'نوتیفیکیشن ادمین'
        verbose_name_plural = 'نوتیفیکیشن‌های ادمین'
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification {self.id} at {self.created_at}"
