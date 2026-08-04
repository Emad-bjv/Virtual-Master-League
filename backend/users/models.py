from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

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
    username = None
    phone_number = models.CharField(max_length=15, unique=True, verbose_name="شماره موبایل")
    virtual_dollars = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="دلار مجازی")
    
    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.phone_number
