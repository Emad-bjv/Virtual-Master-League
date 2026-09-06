"""
Seed script for Barcelona and Real Madrid Legendary Packs.
Creates two packs and 35 legendary players with 99 potential, age 50, and market values > 250M.
"""
import os
import sys
import shutil
from decimal import Decimal
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from gacha.models import Pack, PackPlayer

MEDIA_ROOT = settings.MEDIA_ROOT
PACKS_PLAYERS_DIR = os.path.join(MEDIA_ROOT, 'packs', 'players')
PACKS_CLUBS_DIR = os.path.join(MEDIA_ROOT, 'packs', 'clubs')
os.makedirs(PACKS_PLAYERS_DIR, exist_ok=True)
os.makedirs(PACKS_CLUBS_DIR, exist_ok=True)

# Project root path (where Barca legend & Real madrid legend folders are)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# Copy club logos
BARCA_LOGO_SRC = os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'barcelona.webp')
REAL_LOGO_SRC = os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'real-madrid.webp')

BARCA_LOGO_REL = 'packs/clubs/barcelona.webp'
REAL_LOGO_REL = 'packs/clubs/real-madrid.webp'

# Copy club logos if needed
if not os.path.exists(os.path.join(MEDIA_ROOT, BARCA_LOGO_REL)):
    for cand in [BARCA_LOGO_SRC, '/opt/vml/frontend/public/assets/logos/barcelona.webp', '/app/static/assets/logos/barcelona.webp']:
        if os.path.exists(cand):
            shutil.copy2(cand, os.path.join(MEDIA_ROOT, BARCA_LOGO_REL))
            break

if not os.path.exists(os.path.join(MEDIA_ROOT, REAL_LOGO_REL)):
    for cand in [REAL_LOGO_SRC, '/opt/vml/frontend/public/assets/logos/real-madrid.webp', '/app/static/assets/logos/real-madrid.webp']:
        if os.path.exists(cand):
            shutil.copy2(cand, os.path.join(MEDIA_ROOT, REAL_LOGO_REL))
            break


def copy_player_image(base_dir, folder_name, player_slug):
    """Finds image in folder or existing media, returns relative path."""
    # 1. First check if the file already exists in media/packs/players/
    for ext in ['.webp', '.jpg', '.jpeg', '.png']:
        candidate = os.path.join(PACKS_PLAYERS_DIR, f"{player_slug}{ext}")
        if os.path.exists(candidate):
            return f"packs/players/{player_slug}{ext}"

    # 2. Check candidate folders
    candidate_dirs = [
        base_dir,
        os.path.join("/opt/vml", os.path.basename(base_dir)),
        os.path.join(PROJECT_ROOT, "backend", "media", "packs", "players"),
    ]

    source_folder = None
    for c_dir in candidate_dirs:
        if os.path.exists(c_dir):
            target = os.path.join(c_dir, folder_name)
            if os.path.exists(target):
                source_folder = target
                break
            try:
                for d in os.listdir(c_dir):
                    if d.lower() == folder_name.lower():
                        source_folder = os.path.join(c_dir, d)
                        break
            except Exception:
                pass
        if source_folder:
            break

    if not source_folder or not os.path.exists(source_folder):
        print(f"[WARN] Folder not found for {player_slug}: {folder_name}")
        return ""

    try:
        files = [f for f in os.listdir(source_folder) if os.path.isfile(os.path.join(source_folder, f))]
        if not files:
            print(f"[WARN] No files in folder: {source_folder}")
            return ""

        src_file = files[0]
        ext = os.path.splitext(src_file)[1].lower()
        dest_filename = f"{player_slug}{ext}"
        dest_full_path = os.path.join(PACKS_PLAYERS_DIR, dest_filename)

        shutil.copy2(os.path.join(source_folder, src_file), dest_full_path)
        return f"packs/players/{dest_filename}"
    except Exception as e:
        print(f"[ERROR] Copy failed for {player_slug}: {e}")
        return ""

BARCA_PLAYERS_DATA = [
    {
        "name": "Victor Valdes",
        "folder": "Víctor Valdés",
        "overall": 86,
        "position": "GK",
        "compatible_positions": "GK",
        "nationality": "اسپانیا",
        "market_value": Decimal("255000000.00"),
    },
    {
        "name": "Puyol",
        "folder": "Puyol",
        "overall": 91,
        "position": "CB",
        "compatible_positions": "CB, RB",
        "nationality": "اسپانیا",
        "market_value": Decimal("275000000.00"),
    },
    {
        "name": "Ronald Koeman",
        "folder": "Koeman",
        "overall": 87,
        "position": "CB",
        "compatible_positions": "CB, DMF",
        "nationality": "هلند",
        "market_value": Decimal("260000000.00"),
    },
    {
        "name": "Xavi",
        "folder": "Xavi",
        "overall": 90,
        "position": "CMF",
        "compatible_positions": "CMF, DMF, AMF",
        "nationality": "اسپانیا",
        "market_value": Decimal("285000000.00"),
    },
    {
        "name": "Ronaldinho",
        "folder": "Ronaldiniho",
        "overall": 93,
        "position": "LWF",
        "compatible_positions": "LWF, AMF, SS",
        "nationality": "برزیل",
        "market_value": Decimal("310000000.00"),
    },
    {
        "name": "Messi",
        "folder": "Lionel Messi's",
        "overall": 97,
        "position": "RWF",
        "compatible_positions": "RWF, SS, CF, AMF",
        "nationality": "آرژانتین",
        "market_value": Decimal("350000000.00"),
    },
    {
        "name": "Neymar",
        "folder": "Neymar",
        "overall": 90,
        "position": "LWF",
        "compatible_positions": "LWF, SS, CF",
        "nationality": "برزیل",
        "market_value": Decimal("285000000.00"),
    },
    {
        "name": "Eto'o",
        "folder": "Eto'o",
        "overall": 90,
        "position": "CF",
        "compatible_positions": "CF, SS, LWF",
        "nationality": "کامرون",
        "market_value": Decimal("280000000.00"),
    },
    {
        "name": "Dani Alves",
        "folder": "Dani Alves's",
        "overall": 88,
        "position": "RB",
        "compatible_positions": "RB, RMF",
        "nationality": "برزیل",
        "market_value": Decimal("265000000.00"),
    },
    {
        "name": "Iniesta",
        "folder": "Andrés Iniesta",
        "overall": 90,
        "position": "AMF",
        "compatible_positions": "AMF, CMF, LMF",
        "nationality": "اسپانیا",
        "market_value": Decimal("285000000.00"),
    },
    {
        "name": "Rivaldo",
        "folder": "Rivaldo",
        "overall": 88,
        "position": "LWF",
        "compatible_positions": "LWF, AMF, SS",
        "nationality": "برزیل",
        "market_value": Decimal("270000000.00"),
    },
    {
        "name": "Luis Figo",
        "folder": "Figo",
        "overall": 89,
        "position": "RWF",
        "compatible_positions": "RWF, RMF, AMF",
        "nationality": "پرتغال",
        "market_value": Decimal("275000000.00"),
    },
    {
        "name": "Cruyff",
        "folder": "Cruyff",
        "overall": 95,
        "position": "CF",
        "compatible_positions": "CF, SS, AMF",
        "nationality": "هلند",
        "market_value": Decimal("330000000.00"),
    },
    {
        "name": "Suarez",
        "folder": "Luis Suarez's",
        "overall": 90,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "اروگوئه",
        "market_value": Decimal("280000000.00"),
    },
    {
        "name": "Zlatan",
        "folder": "Zlatan Ibrahimović",
        "overall": 90,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "سوئد",
        "market_value": Decimal("280000000.00"),
    },
    {
        "name": "Pique",
        "folder": "Pique's",
        "overall": 88,
        "position": "CB",
        "compatible_positions": "CB, DMF",
        "nationality": "اسپانیا",
        "market_value": Decimal("265000000.00"),
    },
]

REAL_PLAYERS_DATA = [
    {
        "name": "Casillas",
        "folder": "casillas",
        "overall": 92,
        "position": "GK",
        "compatible_positions": "GK",
        "nationality": "اسپانیا",
        "market_value": Decimal("290000000.00"),
    },
    {
        "name": "S. Ramos",
        "folder": "ramos",
        "overall": 88,
        "position": "CB",
        "compatible_positions": "CB, RB",
        "nationality": "اسپانیا",
        "market_value": Decimal("270000000.00"),
    },
    {
        "name": "F. Hierro",
        "folder": "hierro",
        "overall": 86,
        "position": "CB",
        "compatible_positions": "CB, DMF",
        "nationality": "اسپانیا",
        "market_value": Decimal("255000000.00"),
    },
    {
        "name": "R. Carlos",
        "folder": "carlos",
        "overall": 88,
        "position": "LB",
        "compatible_positions": "LB, LMF",
        "nationality": "برزیل",
        "market_value": Decimal("275000000.00"),
    },
    {
        "name": "T. Kroos",
        "folder": "kroos",
        "overall": 90,
        "position": "CMF",
        "compatible_positions": "CMF, DMF",
        "nationality": "آلمان",
        "market_value": Decimal("280000000.00"),
    },
    {
        "name": "Zidane",
        "folder": "zidane",
        "overall": 94,
        "position": "AMF",
        "compatible_positions": "AMF, CMF, LWF",
        "nationality": "فرانسه",
        "market_value": Decimal("320000000.00"),
    },
    {
        "name": "D. Beckham",
        "folder": "beckham",
        "overall": 90,
        "position": "RMF",
        "compatible_positions": "RMF, RWF, CMF",
        "nationality": "انگلیس",
        "market_value": Decimal("285000000.00"),
    },
    {
        "name": "C. Ronaldo",
        "folder": "Cristiano Ronaldo",
        "overall": 95,
        "position": "LWF",
        "compatible_positions": "LWF, CF, RWF",
        "nationality": "پرتغال",
        "market_value": Decimal("345000000.00"),
    },
    {
        "name": "Ronaldo",
        "folder": "Nazário",
        "overall": 94,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "برزیل",
        "market_value": Decimal("325000000.00"),
    },
    {
        "name": "Benzema",
        "folder": "Karim Benzema",
        "overall": 90,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "فرانسه",
        "market_value": Decimal("280000000.00"),
    },
    {
        "name": "Marcelo",
        "folder": "marcelo",
        "overall": 88,
        "position": "LB",
        "compatible_positions": "LB, LMF",
        "nationality": "برزیل",
        "market_value": Decimal("270000000.00"),
    },
    {
        "name": "X. Alonso",
        "folder": "Xabi alonso",
        "overall": 89,
        "position": "DMF",
        "compatible_positions": "DMF, CMF",
        "nationality": "اسپانیا",
        "market_value": Decimal("275000000.00"),
    },
    {
        "name": "L. Figo",
        "folder": "L. Figo",
        "overall": 88,
        "position": "RWF",
        "compatible_positions": "RWF, RMF, AMF",
        "nationality": "پرتغال",
        "market_value": Decimal("270000000.00"),
    },
    {
        "name": "Di Stefano",
        "folder": "Di stefano",
        "overall": 90,
        "position": "CF",
        "compatible_positions": "CF, SS, AMF",
        "nationality": "اسپانیا",
        "market_value": Decimal("290000000.00"),
    },
    {
        "name": "Puskas",
        "folder": "Puskás",
        "overall": 90,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "مجارستان",
        "market_value": Decimal("290000000.00"),
    },
    {
        "name": "R. Gonzalez",
        "folder": "Raul",
        "overall": 88,
        "position": "CF",
        "compatible_positions": "CF, SS, LWF",
        "nationality": "اسپانیا",
        "market_value": Decimal("275000000.00"),
    },
    {
        "name": "Varane",
        "folder": "Raphaël Varane",
        "overall": 87,
        "position": "CB",
        "compatible_positions": "CB",
        "nationality": "فرانسه",
        "market_value": Decimal("260000000.00"),
    },
    {
        "name": "Pepe",
        "folder": "Pepe",
        "overall": 86,
        "position": "CB",
        "compatible_positions": "CB, DMF",
        "nationality": "پرتغال",
        "market_value": Decimal("255000000.00"),
    },
    {
        "name": "Özil",
        "folder": "Mesut Ozil's",
        "overall": 89,
        "position": "AMF",
        "compatible_positions": "AMF, CMF, LMF",
        "nationality": "آلمان",
        "market_value": Decimal("275000000.00"),
    },
]


def copy_player_image(base_dir, folder_name, player_slug):
    """Finds image in folder, copies it to media/packs/players/, returns relative path."""
    source_folder = os.path.join(base_dir, folder_name)
    if not os.path.exists(source_folder):
        # Fallback search case-insensitively
        for d in os.listdir(base_dir):
            if d.lower() == folder_name.lower():
                source_folder = os.path.join(base_dir, d)
                break

    if not os.path.exists(source_folder):
        print(f"[WARN] Folder not found: {source_folder}")
        return ""

    files = [f for f in os.listdir(source_folder) if os.path.isfile(os.path.join(source_folder, f))]
    if not files:
        print(f"[WARN] No files in folder: {source_folder}")
        return ""

    src_file = files[0]
    ext = os.path.splitext(src_file)[1].lower()
    dest_filename = f"{player_slug}{ext}"
    dest_full_path = os.path.join(PACKS_PLAYERS_DIR, dest_filename)

    shutil.copy2(os.path.join(source_folder, src_file), dest_full_path)
    return f"packs/players/{dest_filename}"


def seed_packs():
    print("--- Starting Seed for Barcelona and Real Madrid Legend Packs ---")

    # 1. Create or Update Barcelona Pack
    barca_pack, created = Pack.objects.update_or_create(
        name="پک اساطیر بارسلونا (Barca Legends)",
        defaults={
            "tier": "LEGENDARY",
            "description": "پک شانس ویژه اسطوره‌های جاودانه باشگاه بارسلونا شامل ۱۶ بازیکن برتر تاریخ کاتالان‌ها.",
            "ovr_range_text": "OVR 86-97",
            "cost_gems": 100,
            "cost_usd": Decimal("0.00"),
            "purchase_method": "GEMS",
            "featured_team": "FC Barcelona",
            "is_active": True,
            "sort_order": 1,
        }
    )
    status_str = "Created" if created else "Updated"
    print(f"{status_str} Barca Pack (ID: {barca_pack.id})")

    barca_base_dir = os.path.join(PROJECT_ROOT, "Barca legend")
    for p in BARCA_PLAYERS_DATA:
        clean_name = p['name'].lower().replace(' ', '_').replace("'", '').replace('.', '')
        slug = f"barca_{clean_name}"
        img_rel = copy_player_image(barca_base_dir, p["folder"], slug)

        player_obj, p_created = PackPlayer.objects.update_or_create(
            pack=barca_pack,
            name=p["name"],
            defaults={
                "position": p["position"],
                "compatible_positions": p["compatible_positions"],
                "overall": p["overall"],
                "potential_ovr": 99,
                "age": 50,
                "base_stamina": 85,
                "nationality": p["nationality"],
                "prime_club": "FC Barcelona",
                "club_logo": BARCA_LOGO_REL,
                "card_image": img_rel,
                "rarity": "LEGENDARY",
                "wage": Decimal("500.00"),
                "market_value": p["market_value"],
                "is_claimed": False,
            }
        )
        print(f"  [{'+' if p_created else '*'}] Barca: {player_obj.name} ({player_obj.position} {player_obj.overall}) - {img_rel}")

    # 2. Create or Update Real Madrid Pack
    real_pack, r_created = Pack.objects.update_or_create(
        name="پک اساطیر رئال مادرید (Real Madrid Legends)",
        defaults={
            "tier": "LEGENDARY",
            "description": "پک شانس ویژه اسطوره‌های کهکشانی باشگاه رئال مادرید شامل ۱۹ بازیکن افتخارآفرین مادریدیسمو.",
            "ovr_range_text": "OVR 86-95",
            "cost_gems": 100,
            "cost_usd": Decimal("0.00"),
            "purchase_method": "GEMS",
            "featured_team": "Real Madrid",
            "is_active": True,
            "sort_order": 2,
        }
    )
    r_status_str = "Created" if r_created else "Updated"
    print(f"\n{r_status_str} Real Madrid Pack (ID: {real_pack.id})")

    real_base_dir = os.path.join(PROJECT_ROOT, "Real madrid legend")
    for p in REAL_PLAYERS_DATA:
        clean_name = (
            p['name'].lower()
            .replace(' ', '_')
            .replace("'", '')
            .replace('.', '')
            .replace('ö', 'o')
            .replace('ä', 'a')
            .replace('ü', 'u')
        )
        slug = f"real_{clean_name}"
        img_rel = copy_player_image(real_base_dir, p["folder"], slug)

        player_obj, p_created = PackPlayer.objects.update_or_create(
            pack=real_pack,
            name=p["name"],
            defaults={
                "position": p["position"],
                "compatible_positions": p["compatible_positions"],
                "overall": p["overall"],
                "potential_ovr": 99,
                "age": 50,
                "base_stamina": 85,
                "nationality": p["nationality"],
                "prime_club": "Real Madrid",
                "club_logo": REAL_LOGO_REL,
                "card_image": img_rel,
                "rarity": "LEGENDARY",
                "wage": Decimal("500.00"),
                "market_value": p["market_value"],
                "is_claimed": False,
            }
        )
        print(f"  [{'+' if p_created else '*'}] Real: {player_obj.name} ({player_obj.position} {player_obj.overall}) - {img_rel}")

    print("\n--- Seeding Completed Successfully! ---")
    print(f"Barcelona Pack Total Players: {barca_pack.players.count()}")
    print(f"Real Madrid Pack Total Players: {real_pack.players.count()}")


if __name__ == "__main__":
    seed_packs()
