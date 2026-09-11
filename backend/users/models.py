from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        if not username:
            raise ValueError('نام کاربری الزامی است.')
        username = username.strip()
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        user = self.model(username=username, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(username, password, **extra_fields)


class User(AbstractUser):
    ROLE_CHOICES = (
        ('coach', 'Coach'),
        ('admin', 'Admin'),
        ('user', 'User'),
    )

    username = models.CharField(max_length=50, unique=True, verbose_name="نام کاربری")
    full_name = models.CharField(max_length=150, blank=True, default='', verbose_name="نام و نام خانوادگی")
    birth_date = models.DateField(null=True, blank=True, verbose_name="تاریخ تولد")
    virtual_dollars = models.DecimalField(max_digits=15, decimal_places=2, default=1000000.00, verbose_name="دلار مجازی")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='coach', verbose_name="نقش کاربر")
    avatar = models.CharField(max_length=255, null=True, blank=True, verbose_name="آواتار")
    rank = models.PositiveIntegerField(default=0, verbose_name="رتبه جهانی")
    points = models.PositiveIntegerField(default=0, verbose_name="امتیاز")
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.username

    def get_admin_permissions(self):
        if self.is_superuser or getattr(self, 'role', '') == 'superadmin':
            return ['*']
        if getattr(self, 'role', '') == 'admin' or self.is_staff:
            if hasattr(self, 'admin_profile') and self.admin_profile:
                if self.admin_profile.admin_role == 'superadmin':
                    return ['*']
                return self.admin_profile.permissions or []
            # Legacy admin without custom profile has full access by default
            return ['*']
        return []

    def has_admin_perm(self, perm_key):
        if not (self.is_staff or self.is_superuser or getattr(self, 'role', '') in ['admin', 'superadmin']):
            return False
        if self.is_superuser or getattr(self, 'role', '') == 'superadmin':
            return True
        if hasattr(self, 'admin_profile') and self.admin_profile:
            return self.admin_profile.has_perm(perm_key)
        return True


class AdminProfile(models.Model):
    ROLE_CHOICES = (
        ('superadmin', 'سوپرادمین (مدیر کل)'),
        ('referee', 'داور و کنترل مسابقات'),
        ('financial_manager', 'مدیر مالی و فروشگاه'),
        ('transfer_manager', 'مدیر نقل‌وانتقالات و تیم‌ها'),
        ('custom', 'سفارشی'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile', verbose_name="کاربر")
    admin_role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='custom', verbose_name="نقش ادمینی")
    title = models.CharField(max_length=100, blank=True, default='ادمین سامانه', verbose_name="عنوان شغلی / مسئولیت")
    permissions = models.JSONField(default=list, blank=True, verbose_name="لیست کلیدهای دسترسی")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ایجاد")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین بروزرسانی")

    class Meta:
        verbose_name = "پروفایل ادمین"
        verbose_name_plural = "پروفایل‌های ادمین‌ها"

    def __str__(self):
        return f"{self.user.username} - {self.get_admin_role_display()} ({self.title})"

    def has_perm(self, perm_key):
        if self.user.is_superuser or self.admin_role == 'superadmin':
            return True
        perms = self.permissions or []
        return '*' in perms or perm_key in perms
