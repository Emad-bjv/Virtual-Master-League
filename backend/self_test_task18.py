import os
import django
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from users.models import User
from teams.models import Team

PASS = "[PASS]"
FAIL = "[FAIL]"

def run_tests():
    print("Running Task 18 Rate Limiting Self-Test...")
    
    # We set 'otp' to '3/min' in settings
    client = Client()
    
    # Try sending 4 OTP requests quickly. The 4th should be 429.
    # Note: the view also has a cache cooldown of 60 seconds that returns 429.
    # To bypass the view's manual cooldown and test DRF throttling, we can use different phone numbers,
    # or clear cache if they use the same number, wait. DRF throttle uses the IP for AnonRateThrottle, 
    # but for ScopedRateThrottle, it depends on whether it's anon or user.
    # Actually, ScopedRateThrottle groups by the scope and IP for anon, or user ID for auth.
    
    # Let's test the 'admin_action' scope which is '60/min'. That's too many to loop.
    # Let's test 'substitution' which is '10/min'.
    # We need a team manager to call update_gameplan.
    team = Team.objects.first()
    if team and getattr(team, 'manager', None):
        manager = team.manager
    else:
        manager, _ = User.objects.get_or_create(phone_number='09888888888', defaults={'role': 'coach'})
        if team:
            team.manager = manager
            team.save()

    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(manager)
    client = Client(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
    
    print("Testing 'substitution' scope (limit 10/min)...")
    success_count = 0
    throttle_count = 0
    
    for i in range(12):
        resp = client.post(f'/api/teams/{team.id}/update_gameplan/', [], content_type='application/json')
        if resp.status_code == 429:
            throttle_count += 1
        elif resp.status_code == 200:
            success_count += 1
    
    if throttle_count > 0:
        print(f"{PASS} Throttling worked for 'substitution'. Success: {success_count}, Throttled: {throttle_count}")
    else:
        print(f"{FAIL} No throttling occurred. Success: {success_count}")

    print("Done.")

if __name__ == '__main__':
    run_tests()
