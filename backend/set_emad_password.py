import os
import sys
import django

sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

print("=================================================================")
print(" CHECKING & CONFIGURING 'admin_emad' ACCOUNT")
print("=================================================================\n")

target_username = 'admin_emad'
target_password = '1017#Emad'

user = User.objects.filter(username__iexact=target_username).first()
if not user:
    user = User.objects.filter(username__icontains='emad').first()

if user:
    print(f"[FOUND] User '{user.username}' (ID: {user.id}) found in database.")
    user.username = target_username
    user.set_password(target_password)
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.role = 'admin'
    user.save()
    print(f"[SUCCESS] Credentials for '{target_username}' updated with password '{target_password}'.")
else:
    print(f"[CREATE] User '{target_username}' not found. Creating new superuser...")
    user = User.objects.create_superuser(
        username=target_username,
        password=target_password,
        role='admin'
    )
    print(f"[SUCCESS] Superuser '{target_username}' created with password '{target_password}'.")

# Also print all existing usernames for convenience
print("\n--- ALL USERS IN DATABASE ---")
for u in User.objects.all():
    print(f"- Username: '{u.username}', Role: '{u.role}', IsStaff: {u.is_staff}, IsSuperuser: {u.is_superuser}")

print("\n=================================================================")
print(f" You can now log in with '{target_username}' and your password '{target_password}'!")
print("=================================================================")
