import os
import sys
import django
import unicodedata
import json
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from transfers.models import TransferLog
from teams.models import Player, Team

def find_missing_transfers():
    print("=== SEARCHING TRANSFER LOGS FOR MISSING TRANSFERS ===")
    
    # Looking for TRANSFER_FINALIZED or OFFER_ACCEPTED
    logs = TransferLog.objects.all().order_by('timestamp')
    
    # We will try to match "Team" and "Player" names in the text
    all_teams = list(Team.objects.all())
    
    found_matches = []
    
    for log in logs:
        desc = log.description
        if not desc: continue
        
        # We only care about logs that might indicate a transfer
        if 'انتقال' in desc or 'فروخته شد' in desc or 'تایید' in desc or 'خرید' in desc or 'پیوست' in desc or 'here we go' in desc.lower():
            # Find which teams are mentioned in the description
            mentioned_teams = [t for t in all_teams if t.name in desc]
            
            # Find which players are mentioned
            # Because player names might be F. Dimarco or Federico Dimarco, we check parts of names
            # But scanning all 522 players for each log is fast enough
            mentioned_players = []
            for p in Player.objects.all():
                p_parts = p.name.split()
                if len(p_parts) >= 2:
                    last_name = p_parts[-1]
                    if last_name in desc and len(last_name) > 3:
                        mentioned_players.append(p)
                elif p.name in desc:
                    mentioned_players.append(p)
                    
            if mentioned_teams and mentioned_players:
                found_matches.append({
                    'log': desc,
                    'teams': [t.name for t in mentioned_teams],
                    'players': [p.name for p in mentioned_players]
                })

    print(f"Found {len(found_matches)} potential transfer logs.")
    for m in found_matches:
        print(f"LOG: {m['log']}")
        print(f"   -> Teams Mentioned: {m['teams']}")
        print(f"   -> Players Mentioned: {m['players']}")
        print("-" * 50)
        
if __name__ == "__main__":
    find_missing_transfers()
