import os
import sys
import django
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team

TEAM_LOGO_MAP = {
    'AC Milan': 'italy_milan_3000x3000.football-logos.cc.webp',
    'Arsenal': 'england_arsenal_3000x3000.football-logos.cc.webp',
    'Atlético Madrid': 'spain_atletico-madrid_3000x3000.football-logos.cc.webp',
    'BVB Borussia Dortmund': 'germany_borussia-dortmund_3000x3000.football-logos.cc.webp',
    'Chelsea': 'england_chelsea_3000x3000.football-logos.cc.webp',
    'FC Barcelona': 'spain_barcelona_3000x3000.football-logos.cc.webp',
    'FC Bayern München': 'germany_bayern-munchen_3000x3000.football-logos.cc.webp',
    'Inter': 'italy_inter_3000x3000.football-logos.cc.webp',
    'Juventus': 'italy_juventus_3000x3000.football-logos.cc.webp',
    'Liverpool': 'england_liverpool_3000x3000.football-logos.cc.webp',
    'Manchester City': 'england_manchester-city_3000x3000.football-logos.cc.webp',
    'Manchester United': 'england_manchester-united_3000x3000.football-logos.cc.webp',
    'Newcastle United': 'england_newcastle_3000x3000.football-logos.cc.webp',
    'Paris Saint-Germain': 'france_paris-saint-germain_3000x3000.football-logos.cc.webp',
    'Real Madrid': 'spain_real-madrid_3000x3000.football-logos.cc.webp',
    'Tottenham Hotspur': 'england_tottenham_3000x3000.football-logos.cc.webp',
}

TEAM_SLUG_MAP = {
    'AC Milan': 'ac-milan.webp',
    'Arsenal': 'arsenal.webp',
    'Atlético Madrid': 'atletico-madrid.webp',
    'BVB Borussia Dortmund': 'borussia-dortmund.webp',
    'Chelsea': 'chelsea.webp',
    'FC Barcelona': 'barcelona.webp',
    'FC Bayern München': 'bayern-munchen.webp',
    'Inter': 'inter.webp',
    'Juventus': 'juventus.webp',
    'Liverpool': 'liverpool.webp',
    'Manchester City': 'manchester-city.webp',
    'Manchester United': 'manchester-united.webp',
    'Newcastle United': 'newcastle.webp',
    'Paris Saint-Germain': 'psg.webp',
    'Real Madrid': 'real-madrid.webp',
    'Tottenham Hotspur': 'tottenham.webp',
}

def process_logos():
    src_dir = r"E:\Codes\Virtual Master League\Team Logos"
    dest_dir = r"E:\Codes\Virtual Master League\frontend\public\logos"
    os.makedirs(dest_dir, exist_ok=True)

    print(f"Processing and resizing 16 team logos to {dest_dir}...")

    for team_name, original_file in TEAM_LOGO_MAP.items():
        src_path = os.path.join(src_dir, original_file)
        if not os.path.exists(src_path):
            print(f"WARNING: Source file {src_path} not found!")
            continue

        img = Image.open(src_path)
        img = img.convert('RGBA')

        # Resize to 512x512 high-quality
        target_size = (512, 512)
        resized_img = img.resize(target_size, Image.Resampling.LANCZOS)

        # Save with original filename in dest_dir
        dest_original = os.path.join(dest_dir, original_file)
        resized_img.save(dest_original, 'WEBP', quality=95)

        # Save with clean slug in dest_dir
        slug_file = TEAM_SLUG_MAP[team_name]
        dest_slug = os.path.join(dest_dir, slug_file)
        resized_img.save(dest_slug, 'WEBP', quality=95)

        # Update database Team.logo
        db_logo_url = f"/logos/{slug_file}"
        Team.objects.filter(name__icontains=team_name.replace('é', 'e').replace('ü', 'u')).update(logo=db_logo_url)
        Team.objects.filter(name=team_name).update(logo=db_logo_url)
        print(f"✓ {team_name}: Resized to 512x512 -> Saved as {slug_file} & {original_file} (DB updated: {db_logo_url})")

    # Double check all teams in DB
    for t in Team.objects.all():
        for k, slug in TEAM_SLUG_MAP.items():
            if k.lower() in t.name.lower() or t.name.lower() in k.lower():
                t.logo = f"/logos/{slug}"
                t.save(update_fields=['logo'])
                break
        print(f"Verified: {t.name} -> {t.logo}")

if __name__ == '__main__':
    process_logos()
