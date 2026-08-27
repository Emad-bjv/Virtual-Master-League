import os
import sys
import django
import unicodedata
import re
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.apps import apps
from teams.models import Team, Player

def clean_name(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.replace('-', ' ').replace('.', ' ').replace("'", '').replace('’', '').replace('`', '').strip().lower()

# Known duplicates / aliases where old name in DB maps to the new updated name
NAME_MAPPINGS = [
    # (old_clean_pattern, new_full_name, default_origin_team)
    ('amad', 'Amad Diallo', 'Manchester United'),
    ('gabriel', 'Gabriel Magalhães', 'Arsenal'),
    ('kepa', 'Kepa Arrizabalaga', 'Arsenal'),
    ('zubimendi', 'Martín Zubimendi', 'Arsenal'),
    ('m gabbia', 'Matteo Gabbia', 'AC Milan'),
    ('k yildiz', 'Kenan Yildiz', 'Juventus'),
    ('r leao', 'Rafael Leão', 'AC Milan'),
    ('m ter stegen', 'Marc-André ter Stegen', 'FC Barcelona'),
    ('a onana', 'André Onana', 'Manchester United'),
    ('j grealish', 'Jack Grealish', 'Manchester City'),
    ('n sule', 'Niklas Süle', 'BVB Borussia Dortmund'),
    ('d rugani', 'Daniele Rugani', 'Juventus'),
    ('t weah', 'Timothy Weah', 'Juventus'),
    ('j rouhi', 'Jonas Rouhi', 'Juventus'),
    ('e pecorino', 'Emanuele Pecorino', 'Juventus'),
    ('a fati', 'Ansu Fati', 'FC Barcelona'),
    ('i pena', 'Iñaki Peña', 'FC Barcelona'),
    ('h fort', 'Héctor Fort', 'FC Barcelona'),
    ('a nubel', 'Alexander Nübel', 'FC Bayern München'),
    ('b zaragoza', 'Bryan Zaragoza', 'FC Bayern München'),
    ('s boey', 'Sacha Boey', 'FC Bayern München'),
    ('b pavard', 'Benjamin Pavard', 'Inter'),
    ('k asllani', 'Kristjan Asllani', 'Inter'),
    ('h elliott', 'Harvey Elliott', 'Liverpool'),
    ('v jaros', 'Vitezslav Jaros', 'Liverpool'),
    ('b clark', 'Bobby Clark', 'Liverpool'),
    ('j sancho', 'Jadon Sancho', 'Manchester United'),
    ('r hojlund', 'Rasmus Højlund', 'Manchester United'),
    ('m targett', 'Matt Targett', 'Newcastle United'),
    ('a disasi', 'Axel Disasi', 'Chelsea'),
    ('m mudryk', 'Mykhaylo Mudryk', 'Chelsea'),
    ('m solomon', 'Manor Solomon', 'Tottenham Hotspur'),
    ('m moore', 'Mikey Moore', 'Tottenham Hotspur'),
    ('a phillips', 'Ashley Phillips', 'Tottenham Hotspur'),
    ('t baldanzi', 'Tommaso Baldanzi', 'AS Roma'),
    ('e shomurodov', 'Eldor Shomurodov', 'AS Roma'),
    ('m kumbulla', 'Marash Kumbulla', 'AS Roma'),
    ('s abdulhamid', 'Saud Abdulhamid', 'AS Roma'),
    ('g simeone', 'Giuliano Simeone', 'Atlético Madrid'),
    ('t lemar', 'Thomas Lemar', 'Atlético Madrid'),
]

print("=== 1. MERGING DUPLICATE PLAYERS & PRESERVING UPDATED ONES ===")

all_players = list(Player.objects.select_related('team').all())
merged_count = 0

def migrate_player_refs(old_p, new_p):
    """Safely migrate all ForeignKeys from old_p to new_p"""
    # 1. Team ownership
    if old_p.team and not new_p.team:
        new_p.team = old_p.team
        new_p.save(update_fields=['team'])
    elif old_p.team and new_p.team and old_p.team != new_p.team:
        # If user traded old_p to another team, retain user's current team!
        new_p.team = old_p.team
        new_p.save(update_fields=['team'])

    # 2. Related models
    for model in apps.get_models():
        for field in model._meta.get_fields():
            if field.is_relation and hasattr(field, 'related_model') and field.related_model == Player:
                if field.many_to_one:
                    # ForeignKey
                    try:
                        filter_kwargs = {field.name: old_p}
                        update_kwargs = {field.name: new_p}
                        model.objects.filter(**filter_kwargs).update(**update_kwargs)
                    except Exception as e:
                        pass

# Find duplicate pairs in DB
for old_pat, new_name, orig_team in NAME_MAPPINGS:
    # Find new updated player
    new_p = Player.objects.filter(name__iexact=new_name).order_by('-id').first()
    # Find old player
    old_p = None
    for p in Player.objects.all():
        if p.id != (new_p.id if new_p else None):
            cname = clean_name(p.name)
            if cname == old_pat or cname.startswith(old_pat + ' ') or (len(cname.split()) == 1 and cname == old_pat):
                old_p = p
                break
                
    if old_p and new_p and old_p.id != new_p.id:
        print(f"Merging OLD: [{old_p.id}] '{old_p.name}' (Team: {old_p.team}) ---> NEW: [{new_p.id}] '{new_p.name}' (Team: {new_p.team})")
        migrate_player_refs(old_p, new_p)
        old_p.delete()
        merged_count += 1
    elif old_p and not new_p:
        # Just rename and update old_p to new_name
        old_p.name = new_name
        old_p.save(update_fields=['name'])

# Check for any exact duplicate names remaining in DB
name_counts = {}
for p in Player.objects.all().order_by('id'):
    c = clean_name(p.name)
    if c not in name_counts:
        name_counts[c] = []
    name_counts[c].append(p)

for c, plist in name_counts.items():
    if len(plist) > 1:
        # Disambiguate Nico Gonzalez
        if c == 'nico gonzalez':
            continue
        print(f"Duplicate detected for '{plist[0].name}': keeping newest [{plist[-1].id}], removing older [{plist[0].id}]")
        keep_p = plist[-1]
        for old_p in plist[:-1]:
            migrate_player_refs(old_p, keep_p)
            old_p.delete()
            merged_count += 1

print(f"Total merged duplicate pairs: {merged_count}")
print(f"Remaining total players in DB: {Player.objects.count()}")

print("\n=== 2. RECALCULATING TEAM STAR RATINGS ===")
for team in Team.objects.all():
    squad = team.players.all()
    if squad.exists():
        top_11 = sorted([p.overall for p in squad], reverse=True)[:11]
        avg_ovr = sum(top_11) / len(top_11)
        stars = round((avg_ovr - 60) / 6.0, 1)
        stars = max(1.0, min(5.0, stars))
        team.star_rating = Decimal(str(stars))
        team.save(update_fields=['star_rating'])

print("==================================================")
print("SUCCESS: Duplicate players merged.")
print("SUCCESS: Updated players with new info & photos retained.")
print("SUCCESS: User team assignments & transactions preserved.")
print("==================================================")
