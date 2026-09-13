import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User

def promote(username):
    if not username:
        print("Usage: python promote_user.py <username_or_team>")
        return

    username = str(username).strip()
    user = User.objects.filter(username__iexact=username).first()
    if not user:
        from teams.models import Team
        team = Team.objects.filter(name__icontains=username).first()
        if team and team.manager:
            user = team.manager

    if not user:
        print(f"[-] User '{username}' not found.")
        return

    user.role = 'admin'
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.save(update_fields=['role', 'is_staff', 'is_superuser', 'is_active'])
    print(f"[+] User '{user.username}' successfully promoted to SUPERADMIN / ADMIN!")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'admin_emad'
    promote(target)
