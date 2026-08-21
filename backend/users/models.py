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
