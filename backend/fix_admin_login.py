import os
import sys
import django

sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

print("=================================================================")
print(" USER & ADMIN AUTHENTICATION DIAGNOSTIC & FIX")
print("=================================================================\n")

admins = User.objects.filter(is_staff=True) | User.objects.filter(is_superuser=True)
print(f"Total Admin/Staff accounts found: {admins.count()}")

for a in admins:
    print(f"- Username: '{a.username}', Phone: '{a.phone_number}', IsSuperuser: {a.is_superuser}, IsStaff: {a.is_staff}")

# If admin user exists, reset password to admin123 (or ensure superuser)
admin_user = User.objects.filter(username__in=['admin', 'manager', 'superuser']).first()
if not admin_user:
    admin_user = admins.first()

if admin_user:
    admin_user.set_password('admin123')
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()
    print(f"\n[FIXED] Admin user '{admin_user.username}' password set to: 'admin123'")
else:
    new_admin = User.objects.create_superuser(
        username='admin',
        phone_number='09120000000',
        password='admin123'
    )
    print(f"\n[CREATED] New Superuser 'admin' created with password: 'admin123'")

print("\n=================================================================")
print(" All done! You can now log in with username: 'admin' and password: 'admin123'")
print("=================================================================")
