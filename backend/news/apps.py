from django.apps import AppConfig


class NewsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'news'
    verbose_name = 'اتاق خبر و مطبوعات لیگ'

    def ready(self):
        import news.signals  # noqa
