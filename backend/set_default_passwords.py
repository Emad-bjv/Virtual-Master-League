import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

print("Resetting passwords for all users to default '123456' (and 'admin' for admin/superadmin)...")
for u in User.objects.all():
    if u.role in ['admin', 'superadmin'] or u.username in ['coach_admin', 'admin']:
        u.set_password('admin')
        u.save(update_fields=['password'])
        print(f"Set password 'admin' for {u.username} ({u.role})")
    else:
        u.set_password('123456')
        u.save(update_fields=['password'])
        print(f"Set password '123456' for {u.username} ({u.role})")

print("Done! All user passwords initialized.")
