from django.db import models
from teams.models import Team, Player


class GachaPack(models.Model):
    name = models.CharField(max_length=100, verbose_name="نام پک")
    cost_usd = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="قیمت پک به دلار مجازی"
    )
    # Probabilities in percentage (must sum to 100.00)
    rate_rare = models.DecimalField(
        max_digits=5, decimal_places=2, default=70.00, verbose_name="شانس Rare (%)"
    )
    rate_epic = models.DecimalField(
        max_digits=5, decimal_places=2, default=25.00, verbose_name="شانس Epic (%)"
    )
    rate_legendary = models.DecimalField(
        max_digits=5, decimal_places=2, default=5.00, verbose_name="شانس Legendary (%)"
    )
    is_active = models.BooleanField(default=True, verbose_name="فعال است؟")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "پک گاشا"
        verbose_name_plural = "پک‌های گاشا"

    def __str__(self):
        return f"{self.name} - {self.cost_usd} USD"


class GachaPity(models.Model):
    """
    Tracks Pity Counter for each team.
    If counter reaches 9 without Legendary, the 10th pull is guaranteed Legendary.
    """
    PITY_THRESHOLD = 9

    team = models.OneToOneField(
        Team, on_delete=models.CASCADE,
        related_name='gacha_pity', verbose_name="تیم"
    )
    counter = models.PositiveIntegerField(
        default=0, verbose_name="شمارنده Pity (تعداد پک بدون Legendary)"
    )
    total_pulls = models.PositiveIntegerField(
        default=0, verbose_name="کل پک‌های باز شده"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "شمارنده Pity تیم"
        verbose_name_plural = "شمارنده‌های Pity تیم‌ها"

    def __str__(self):
        return f"{self.team.name} Pity Counter: {self.counter}/9"


class PackOpeningLog(models.Model):
    RARITY_CHOICES = [
        ('RARE', 'Rare (OVR 70-79)'),
        ('EPIC', 'Epic (OVR 80-86)'),
        ('LEGENDARY', 'Legendary (OVR 87+)'),
    ]

    team = models.ForeignKey(
        Team, on_delete=models.CASCADE,
        related_name='pack_logs', verbose_name="تیم"
    )
    pack = models.ForeignKey(
        GachaPack, on_delete=models.SET_NULL, null=True,
        related_name='logs', verbose_name="پک باز شده"
    )
    player_obtained = models.ForeignKey(
        Player, on_delete=models.SET_NULL, null=True,
        related_name='obtained_from_packs', verbose_name="بازیکن بدست آمده"
    )
    rarity_drawn = models.CharField(
        max_length=15, choices=RARITY_CHOICES, verbose_name="درجه ناداری"
    )
    pity_applied = models.BooleanField(
        default=False, verbose_name="از سیستم Pity استفاده شد؟"
    )
    cost_usd = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="مبلغ پرداختی"
    )
    opened_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان بازکردن")

    class Meta:
        verbose_name = "تاریخچه بازکردن پک"
        verbose_name_plural = "تاریخچه بازکردن پک‌ها"
        ordering = ['-opened_at']

    def __str__(self):
        p_name = self.player_obtained.name if self.player_obtained else "None"
        return f"{self.team.name} opened {self.pack.name if self.pack else 'Pack'} ➔ {p_name} [{self.rarity_drawn}]"
