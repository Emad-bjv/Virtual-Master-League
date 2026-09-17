import json, sys
sys.stdout.reconfigure(encoding='utf-8')

data = json.load(open('scratch/report_51_players.json', encoding='utf-8'))
changed = [x for x in data if x['is_changed']]
print(f"Total changed: {len(changed)}\n")
for x in changed:
    print(f"- **{x['name']}** (ID: {x['id']}): فعلی: `{x['current_broken']}` ⬅️ صحیح: **`{x['correct_team']}`**\n  - علت و سند: {x['proof']}")
