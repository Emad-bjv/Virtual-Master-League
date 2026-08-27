import os
import sys
import django
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Player, Team
from transfers.models import TransferLog

def run():
    print("=== SEARCHING FOR MISSING PLAYERS BASED ON LOGS ===")
    
    current_players = {p.name.lower(): p for p in Player.objects.all()}
    missing_candidates = set()
    
    logs = TransferLog.objects.all().order_by('timestamp')
    print(f"Total TransferLogs: {logs.count()}")
    
    for log in logs:
        desc = log.description or ''
        
        # Patterns to extract names
        patterns = [
            r'برای جذب (.*?) به تیم',
            r'پیشنهاد ثبت شده برای (.*?) توسط',
            r'پیشنهاد متقابل .*? برای (.*?) به تیم',
            r'انتقال (.*?) از تیم',
            r'انتقال (.*?) به تیم',
            r'معاوضه:\s*([^\s]+.*?)\s*برای'
        ]
        
        for pat in patterns:
            match = re.search(pat, desc)
            if match:
                missing_candidates.add(match.group(1).strip())
                
    missing_players = []
    for candidate in missing_candidates:
        c_lower = candidate.lower()
        if c_lower in current_players:
            continue
            
        found = False
        for p_name in current_players:
            if c_lower in p_name or p_name in c_lower:
                found = True
                break
                
        if not found:
            missing_players.append(candidate)
            
    print("\n--- MISSING PLAYERS ---")
    if not missing_players:
        print("No missing players found in logs.")
    else:
        for mp in missing_players:
            print(f"- {mp}")
            
if __name__ == '__main__':
    run()
