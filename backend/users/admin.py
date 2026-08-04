from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


class UserAdmin(BaseUserAdmin):
    list_display = ('phone_number', 'virtual_dollars', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active')
    search_fields = ('phone_number',)
    ordering = ('phone_number',)
    
    fieldsets = (
        (None, {'fields': ('phone_number', 'password')}),
        ('اطلاعات شخصی', {'fields': ('first_name', 'last_name', 'email')}),
        ('اقتصاد', {'fields': ('virtual_dollars',)}),
        ('دسترسی‌ها', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('تاریخ‌ها', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'password1', 'password2'),
        }),
    )


admin.site.register(User, UserAdmin)
