import os
import sys
import django
import re

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Player

def validate_frontend_enums():
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend', 'src')
    
    valid_positions = set(dict(Player.POSITIONS).keys())
    
    # Regex to find things like position: 'ST' or position === 'ST'
    # It might be naive, but useful as an audit tool
    position_regex = re.compile(r"""(?:position|player\.position)\s*(?:===|==|:|={)\s*['"]([^'"]+)['"]""")
    
    issues_found = 0
    print(f"Valid positions from backend: {valid_positions}")
    
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith(('.jsx', '.js')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                matches = position_regex.findall(content)
                for match in matches:
                    if match not in valid_positions:
                        print(f"[WARNING] Invalid position '{match}' found in {os.path.relpath(filepath, frontend_dir)}")
                        issues_found += 1
                        
    if issues_found == 0:
        print("No enum mismatches found!")
    else:
        print(f"Found {issues_found} enum mismatches.")
        
if __name__ == '__main__':
    validate_frontend_enums()
