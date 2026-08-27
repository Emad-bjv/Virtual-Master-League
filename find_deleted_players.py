import os, sys, django, re
sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Player, Team
from transfers.models import TransferLog

# Get all current player names in lower case for fast matching
current_players = {p.name.lower(): p for p in Player.objects.all()}

missing_candidates = set()

# Parse TransferLogs to find names
logs = TransferLog.objects.all().order_by('timestamp')
for log in logs:
    desc = log.description or ''
    # "تیم X پیشنهادی ... برای جذب Y به تیم Z ارسال کرد."
    # "انتقال Y به تیم X با موفقیت انجام شد."
    
    # Let's use some regex to extract player names.
    # Pattern 1: برای جذب (.*?) به تیم
    match1 = re.search(r'برای جذب (.*?) به تیم', desc)
    if match1:
        name = match1.group(1).strip()
        missing_candidates.add(name)
        
    # Pattern 2: پیشنهاد ثبت شده برای (.*?) توسط
    match2 = re.search(r'پیشنهاد ثبت شده برای (.*?) توسط', desc)
    if match2:
        name = match2.group(1).strip()
        missing_candidates.add(name)
        
    # Pattern 3: یک پیشنهاد متقابل .*? برای (.*?) به تیم
    match3 = re.search(r'پیشنهاد متقابل .*? برای (.*?) به تیم', desc)
    if match3:
        name = match3.group(1).strip()
        missing_candidates.add(name)
        
    # Pattern 4: انتقال (.*?) از تیم
    match4 = re.search(r'انتقال (.*?) از تیم', desc)
    if match4:
        name = match4.group(1).strip()
        missing_candidates.add(name)
        
    # Pattern 5: انتقال (.*?) به تیم
    match5 = re.search(r'انتقال (.*?) به تیم', desc)
    if match5:
        name = match5.group(1).strip()
        missing_candidates.add(name)
        
    # Pattern 6: معاوضه: (.*?) برای
    match6 = re.search(r'معاوضه:\s*([^\s]+.*?)\s*برای', desc)
    if match6:
        name = match6.group(1).strip()
        missing_candidates.add(name)

# Now check which candidates are missing
missing_players = []
for candidate in missing_candidates:
    c_lower = candidate.lower()
    
    # Basic direct match
    if c_lower in current_players:
        continue
        
    # Partial match
    found = False
    for p_name in current_players:
        if c_lower in p_name or p_name in c_lower:
            found = True
            break
            
    if not found:
        missing_players.append(candidate)

with open("missing_players.txt", "w", encoding="utf-8") as f:
    f.write("Found missing players based on transfer logs:\n")
    for mp in missing_players:
        f.write(mp + "\n")
print("Missing players saved to missing_players.txt")
