from django.db import models
from django.conf import settings


class LeagueNews(models.Model):
    CATEGORY_CHOICES = [
        ('TRANSFER', 'نقل‌وانتقالات'),
        ('MATCH', 'مسابقات و نتایج'),
        ('DISCIPLINARY', 'احکام انضباطی'),
        ('COACH', 'مربیان و باشگاه‌ها'),
        ('GENERAL', 'عمومی و بیانیه‌ها'),
    ]

    title = models.CharField(max_length=255, verbose_name="تیتر خبر")
    subtitle = models.CharField(max_length=255, blank=True, default='', verbose_name="روتیتر / تگ فرعی")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='GENERAL', verbose_name="دسته‌بندی")
    summary = models.TextField(verbose_name="خلاصه کوتاه خبر")
    content = models.TextField(verbose_name="متن کامل گزارش خبری")
    image_url = models.CharField(max_length=500, blank=True, default='', verbose_name="آدرس تصویر شاخص")

    # Anti-duplication and database traceability
    source_event_type = models.CharField(max_length=50, blank=True, default='', verbose_name="نوع رویداد منبع")
    source_event_id = models.CharField(max_length=50, blank=True, default='', verbose_name="شناسه رویداد منبع")
    event_hash = models.CharField(max_length=64, unique=True, null=True, blank=True, verbose_name="هش یکتای رویداد (ضدتکرار)")

    # Moderation & Visibility
    is_published = models.BooleanField(default=True, verbose_name="منتشر شده در چنل")
    is_pinned = models.BooleanField(default=False, verbose_name="سنجاق‌شده به بالای فید (Pin)")
    views_count = models.PositiveIntegerField(default=0, verbose_name="تعداد بازدیدها")
    reactions_count = models.JSONField(default=dict, blank=True, verbose_name="شمارش واکنش‌ها")

    # Relationships
    related_player = models.ForeignKey(
        'teams.Player', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='news_mentions', verbose_name="بازیکن مرتبط"
    )
    related_team = models.ForeignKey(
        'teams.Team', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='news_articles', verbose_name="تیم مرتبط"
    )
    related_match = models.ForeignKey(
        'matches.Match', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='match_reports', verbose_name="مسابقه مرتبط"
    )

    author_name = models.CharField(max_length=100, default='اتاق خبر رسمی VML', verbose_name="نویسنده / منبع خبر")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ و ساعت انتشار")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین بروزرسانی")

    class Meta:
        verbose_name = "خبر مطبوعاتی لیگ"
        verbose_name_plural = "اخبار و مطبوعات لیگ"
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"[{self.get_category_display()}] {self.title}"


class NewsReaction(models.Model):
    REACTION_TYPES = [
        ('fire', '🔥 آتیش'),
        ('heart', '❤️ قلب'),
        ('like', '👍 عالی'),
        ('clap', '👏 تشویق'),
        ('mindblown', '🤯 برگ‌ریزون'),
    ]

    news = models.ForeignKey(LeagueNews, on_delete=models.CASCADE, related_name='user_reactions', verbose_name="خبر")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='news_reactions', verbose_name="کاربر")
    reaction_type = models.CharField(max_length=20, choices=REACTION_TYPES, verbose_name="نوع واکنش")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت واکنش")

    class Meta:
        verbose_name = "واکنش مربی به خبر"
        verbose_name_plural = "واکنش‌های مربیان به اخبار"
        unique_together = ('news', 'user', 'reaction_type')

    def __str__(self):
        return f"{self.user} -> {self.news.title[:20]} ({self.reaction_type})"
