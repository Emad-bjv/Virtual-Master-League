from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone

class UserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('شماره موبایل الزامی است.')
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        user = self.model(phone_number=phone_number, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(phone_number, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('coach', 'Coach'),
        ('admin', 'Admin'),
        ('user', 'User'),
    )

    username = None
    phone_number = models.CharField(max_length=15, unique=True, verbose_name="شماره موبایل")
    virtual_dollars = models.DecimalField(max_digits=15, decimal_places=2, default=1000000.00, verbose_name="دلار مجازی")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='coach', verbose_name="نقش کاربر")
    avatar = models.CharField(max_length=255, null=True, blank=True, verbose_name="آواتار")
    rank = models.PositiveIntegerField(default=0, verbose_name="رتبه جهانی")
    points = models.PositiveIntegerField(default=0, verbose_name="امتیاز")
    
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.phone_number


class OTPRecord(models.Model):
    phone_number = models.CharField(max_length=15, verbose_name="شماره موبایل")
    code = models.CharField(max_length=6, verbose_name="کد OTP")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ایجاد")
    expires_at = models.DateTimeField(verbose_name="زمان انقضا")
    is_used = models.BooleanField(default=False, verbose_name="استفاده شده")
    attempts = models.PositiveIntegerField(default=0, verbose_name="تعداد تلاش‌ها")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "کد تایید OTP"
        verbose_name_plural = "کدهای تایید OTP"

    def __str__(self):
        return f"OTP for {self.phone_number} ({self.code})"

    def is_expired(self) -> bool:
        """Returns True when the OTP code has passed its expiry timestamp."""
        return timezone.now() > self.expires_at

