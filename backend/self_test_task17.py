import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from users.models import User
from teams.models import Team, Player, ClubFacilities
from audit.models import AdminAuditLog
import json

PASS = "[PASS]"
FAIL = "[FAIL]"

def run_tests():
    print("Running Task 17 Audit Logs Self-Test...")
    
    # 1. Setup Data
    admin_user, _ = User.objects.get_or_create(phone_number='09999999999', defaults={'role': 'superadmin', 'is_staff': True, 'is_superuser': True})
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()
    
    team = Team.objects.first()
    player = team.players.first()
    facilities, _ = ClubFacilities.objects.get_or_create(team=team)
    
    client = Client()
    client.force_login(admin_user)
    
    # Clean up old logs
    AdminAuditLog.objects.all().delete()
    
    # 2. Test BUDGET_ADJUST
    resp_budget = client.post('/api/teams/admin_adjust_budget/', {
        'team_id': team.id,
        'amount': 1000,
        'reason': 'Test Budget Adjust'
    })
    if resp_budget.status_code == 200:
        log = AdminAuditLog.objects.filter(action_type='BUDGET_ADJUST').first()
        if log and log.reason == 'Test Budget Adjust':
            print(f"{PASS} Budget Adjust logged successfully.")
        else:
            print(f"{FAIL} Budget Adjust log not found.")
    else:
        print(f"{FAIL} Budget adjust endpoint failed: {resp_budget.status_code}")
        
    # 3. Test FACILITY_OVERRIDE
    resp_facility = client.post('/api/teams/admin_override_facility/', {
        'team_id': team.id,
        'facility': 'training_camp_level',
        'level': 5,
        'reason': 'Test Facility Override'
    })
    if resp_facility.status_code == 200:
        log = AdminAuditLog.objects.filter(action_type='FACILITY_OVERRIDE').first()
        if log and log.reason == 'Test Facility Override':
            print(f"{PASS} Facility Override logged successfully.")
        else:
            print(f"{FAIL} Facility Override log not found.")
    else:
        print(f"{FAIL} Facility override endpoint failed: {resp_facility.status_code}")
        
    # 4. Test PLAYER_UPDATE
    resp_player = client.post('/api/teams/admin_update_player/', {
        'player_id': player.id,
        'overall': 99,
        'reason': 'Test Player Update'
    })
    if resp_player.status_code == 200:
        log = AdminAuditLog.objects.filter(action_type='PLAYER_UPDATE').first()
        if log and log.reason == 'Test Player Update':
            print(f"{PASS} Player Update logged successfully.")
        else:
            print(f"{FAIL} Player Update log not found.")
    else:
        print(f"{FAIL} Player update endpoint failed: {resp_player.status_code}")
        
    # 5. Test ReadOnlyModelViewSet restriction (DELETE)
    if AdminAuditLog.objects.exists():
        log_id = AdminAuditLog.objects.first().id
        resp_delete = client.delete(f'/api/audit/logs/{log_id}/')
        if resp_delete.status_code in [401, 403, 405]: # Unauthorized/Forbidden/Method Not Allowed
            print(f"{PASS} Audit log DELETE returns {resp_delete.status_code} (Restricted).")
        else:
            print(f"{FAIL} Audit log DELETE returned {resp_delete.status_code} instead of restricted.")
    else:
        print(f"{FAIL} No logs found to test DELETE.")
        
    print("Done.")

if __name__ == '__main__':
    run_tests()
