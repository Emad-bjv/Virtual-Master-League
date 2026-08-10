from django.db import models
from django.core.exceptions import ValidationError

class GlobalSettings(models.Model):
    current_season = models.PositiveIntegerField(default=1, verbose_name="فصل جاری")
    current_week = models.PositiveIntegerField(default=1, verbose_name="هفته جاری")
    is_transfer_window_open = models.BooleanField(default=False, verbose_name="پنجره نقل و انتقالات باز است؟")

    class Meta:
        verbose_name = "تنظیمات سراسری"
        verbose_name_plural = "تنظیمات سراسری"

    def save(self, *args, **kwargs):
        if not self.pk and GlobalSettings.objects.exists():
            raise ValidationError('Only one instance of GlobalSettings can be created.')
        return super().save(*args, **kwargs)

    def __str__(self):
        return "تنظیمات سراسری سیستم"

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
