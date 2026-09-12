"""
Seed script for:
1. AC Milan & Juventus Legendary Pack (27 players)
2. Liverpool & Manchester United Legendary Pack (17 players)

Includes full stats, compatible positions, nationalities, prime clubs, club logos,
and copies all card images with standardized filenames to media/packs/players/.
"""
import os
import sys
import shutil
from decimal import Decimal

# Set standard output encoding
sys.stdout.reconfigure(encoding='utf-8')

# Setup Django environment
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
from gacha.models import Pack, PackPlayer

MEDIA_ROOT = settings.MEDIA_ROOT
PACKS_PLAYERS_DIR = os.path.join(MEDIA_ROOT, 'packs', 'players')
PACKS_CLUBS_DIR = os.path.join(MEDIA_ROOT, 'packs', 'clubs')
os.makedirs(PACKS_PLAYERS_DIR, exist_ok=True)
os.makedirs(PACKS_CLUBS_DIR, exist_ok=True)

PROJECT_ROOT = os.path.abspath(os.path.join(BACKEND_DIR, '..'))

# Club logo sources
LOGO_SOURCES = {
    'ac-milan.webp': [
        os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'ac-milan.webp'),
        os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'italy_milan_3000x3000.football-logos.cc.webp'),
    ],
    'juventus.webp': [
        os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'juventus.webp'),
        os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'italy_juventus_3000x3000.football-logos.cc.webp'),
    ],
    'liverpool.webp': [
        os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'liverpool.webp'),
        os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'england_liverpool_3000x3000.football-logos.cc.webp'),
    ],
    'manchester-united.webp': [
        os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'manchester-united.webp'),
        os.path.join(PROJECT_ROOT, 'frontend', 'public', 'assets', 'logos', 'england_manchester-united_3000x3000.football-logos.cc.webp'),
    ],
}

# Copy club logos if needed
for filename, candidates in LOGO_SOURCES.items():
    dest = os.path.join(PACKS_CLUBS_DIR, filename)
    if not os.path.exists(dest):
        for cand in candidates:
            if os.path.exists(cand):
                shutil.copy2(cand, dest)
                print(f"[OK] Copied club logo: {filename}")
                break


def copy_player_image(base_dir, folder_name, slug):
    """
    Finds the image file inside folder_name under base_dir,
    and copies it to media/packs/players/{slug}.{ext}
    """
    source_folder = os.path.join(base_dir, folder_name)
    if not os.path.exists(source_folder):
        # Case insensitive check
        found = False
        if os.path.exists(base_dir):
            for d in os.listdir(base_dir):
                if d.lower() == folder_name.lower():
                    source_folder = os.path.join(base_dir, d)
                    found = True
                    break
        if not found:
            print(f"[WARN] Folder not found: {folder_name}")
            return ""

    try:
        files = [f for f in os.listdir(source_folder) if os.path.isfile(os.path.join(source_folder, f))]
        if not files:
            print(f"[WARN] No files found in {source_folder}")
            return ""

        src_file = files[0]
        ext = os.path.splitext(src_file)[1].lower()
        if not ext:
            ext = '.webp'
        dest_filename = f"{slug}{ext}"
        dest_full = os.path.join(PACKS_PLAYERS_DIR, dest_filename)

        shutil.copy2(os.path.join(source_folder, src_file), dest_full)
        return f"packs/players/{dest_filename}"
    except Exception as e:
        print(f"[ERROR] Failed copying image for {slug}: {e}")
        return ""


# Market value mapping based on overall rating
def get_market_value(ovr: int) -> Decimal:
    VAL_MAP = {
        86: Decimal("255000000.00"),
        87: Decimal("260000000.00"),
        88: Decimal("270000000.00"),
        89: Decimal("275000000.00"),
        90: Decimal("285000000.00"),
        91: Decimal("290000000.00"),
        92: Decimal("300000000.00"),
        93: Decimal("310000000.00"),
        94: Decimal("320000000.00"),
        95: Decimal("330000000.00"),
        96: Decimal("340000000.00"),
        97: Decimal("350000000.00"),
    }
    return VAL_MAP.get(ovr, Decimal("260000000.00"))


MILAN_PLAYERS = [
    {
        "name": "Dida",
        "folder": "dida gk - Google Search",
        "slug": "milan_dida",
        "overall": 87,
        "position": "GK",
        "compatible_positions": "GK",
        "nationality": "برزیل",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Nesta",
        "folder": "Nesta Icon EA FC 26 - 88 - Rating and Price _ FUTBIN",
        "slug": "milan_nesta",
        "overall": 90,
        "position": "CB",
        "compatible_positions": "CB",
        "nationality": "ایتالیا",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Cafu",
        "folder": "Cafu Icon EA FC 26 - 92 - Rating and Price _ FUTBIN",
        "slug": "milan_cafu",
        "overall": 88,
        "position": "RB",
        "compatible_positions": "RB, RMF",
        "nationality": "برزیل",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Maldini",
        "folder": "Maldini Icon EA FC 26 - 97 - Rating and Price _ FUTBIN",
        "slug": "milan_maldini",
        "overall": 91,
        "position": "LB",
        "compatible_positions": "LB, CB",
        "nationality": "ایتالیا",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Pirlo",
        "folder": "Pirlo Icon EA FC 26 - 91 - Rating and Price _ FUTBIN",
        "slug": "milan_pirlo",
        "overall": 91,
        "position": "CMF",
        "compatible_positions": "CMF, DMF, AMF",
        "nationality": "ایتالیا",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Ronaldinho",
        "folder": "de Assis Moreira Icon EA FC 26 - 94 - Rating and Price _ FUTBIN",
        "slug": "milan_ronaldinho",
        "overall": 91,
        "position": "LWF",
        "compatible_positions": "LWF, AMF, SS",
        "nationality": "برزیل",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Kaka",
        "folder": "Kaká Icon EA FC 24 - 91 - Rating and Price _ FUTBIN",
        "slug": "milan_kaka",
        "overall": 90,
        "position": "AMF",
        "compatible_positions": "AMF, SS, CF",
        "nationality": "برزیل",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "George Weah",
        "folder": "george weah - Google Search",
        "slug": "milan_george_weah",
        "overall": 89,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "لیبریا",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Van Basten",
        "folder": "van Basten Icon EA FC 26 - 92 - Rating and Price _ FUTBIN",
        "slug": "milan_van_basten",
        "overall": 90,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "هلند",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Gattuso",
        "folder": "Gattuso Icon EA FC 26 - 97 - Rating and Price _ FUTBIN",
        "slug": "milan_gattuso",
        "overall": 87,
        "position": "DMF",
        "compatible_positions": "DMF, CMF",
        "nationality": "ایتالیا",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Frank Rijkaard",
        "folder": "Rijkaard Icon EA FC 26 - 89 - Rating and Price _ FUTBIN",
        "slug": "milan_frank_rijkaard",
        "overall": 90,
        "position": "DMF",
        "compatible_positions": "DMF, CB, CMF",
        "nationality": "هلند",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Seedorf",
        "folder": "Clarence Seedorf Icon EA FC 24 - 90 - Rating and Price _ FUTBIN",
        "slug": "milan_seedorf",
        "overall": 89,
        "position": "CMF",
        "compatible_positions": "CMF, AMF, LMF",
        "nationality": "هلند",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Gullit",
        "folder": "Gullit Icon EA FC 26 - 93 - Rating and Price _ FUTBIN",
        "slug": "milan_gullit",
        "overall": 89,
        "position": "AMF",
        "compatible_positions": "AMF, CF, SS",
        "nationality": "هلند",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Shevchenko",
        "folder": "Shevchenko Icon EA FC 26 - 90 - Rating and Price _ FUTBIN",
        "slug": "milan_shevchenko",
        "overall": 89,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "اوکراین",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
    {
        "name": "Zlatan",
        "folder": "Ibrahimovic Icon EA FC 26 - 95 - Rating and Price _ FUTBIN",
        "slug": "milan_zlatan",
        "overall": 89,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "سوئد",
        "prime_club": "AC Milan",
        "club_logo": "packs/clubs/ac-milan.webp",
    },
]

JUVENTUS_PLAYERS = [
    {
        "name": "G. Buffon",
        "folder": "Buffon Icon EA FC 26 - 92 - Rating and Price _ FUTBIN",
        "slug": "juve_buffon",
        "overall": 93,
        "position": "GK",
        "compatible_positions": "GK",
        "nationality": "ایتالیا",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "F. Cannavaro",
        "folder": "Cannavaro Icon EA FC 26 - 98 - Rating and Price _ FUTBIN",
        "slug": "juve_cannavaro",
        "overall": 89,
        "position": "CB",
        "compatible_positions": "CB",
        "nationality": "ایتالیا",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "G. Chiellini",
        "folder": "Giorgio Chiellini Icon EA FC 26 - 92 - Rating and Price _ FUTBIN",
        "slug": "juve_chiellini",
        "overall": 88,
        "position": "CB",
        "compatible_positions": "CB",
        "nationality": "ایتالیا",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "A. Pirlo",
        "folder": "Pirlo Icon EA FC 26 - 96 - Rating and Price _ FUTBIN",
        "slug": "juve_pirlo",
        "overall": 89,
        "position": "CMF",
        "compatible_positions": "CMF, DMF, AMF",
        "nationality": "ایتالیا",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "E. Davids",
        "folder": "Edgar Davids - Customized _ SoFIFA",
        "slug": "juve_davids",
        "overall": 90,
        "position": "DMF",
        "compatible_positions": "DMF, CMF",
        "nationality": "هلند",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "P. Nedved",
        "folder": "Nedved Icon EA FC 26 - 89 - Rating and Price _ FUTBIN",
        "slug": "juve_nedved",
        "overall": 89,
        "position": "CMF",
        "compatible_positions": "CMF, AMF, RMF",
        "nationality": "جمهوری چک",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "R. Baggio",
        "folder": "Baggio Icon EA FC 26 - 92 - Rating and Price _ FUTBIN",
        "slug": "juve_baggio",
        "overall": 91,
        "position": "SS",
        "compatible_positions": "SS, AMF, CF",
        "nationality": "ایتالیا",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "Del Piero",
        "folder": "Del Piero Icon EA FC 26 - 95 - Rating and Price _ FUTBIN",
        "slug": "juve_del_piero",
        "overall": 92,
        "position": "SS",
        "compatible_positions": "SS, CF, AMF",
        "nationality": "ایتالیا",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "M. Platini",
        "folder": "michel platini - Google Search",
        "slug": "juve_platini",
        "overall": 91,
        "position": "AMF",
        "compatible_positions": "AMF, CMF, SS",
        "nationality": "فرانسه",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "Z. Zidane",
        "folder": "Zidane Icon EA FC 26 - 95 - Rating and Price _ FUTBIN",
        "slug": "juve_zidane",
        "overall": 92,
        "position": "AMF",
        "compatible_positions": "AMF, CMF, LWF",
        "nationality": "فرانسه",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "G. Higuain",
        "folder": "Gonzalo Higuaín - EA FC card generations & ratings _ FUTBIN",
        "slug": "juve_higuain",
        "overall": 89,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "آرژانتین",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
    {
        "name": "Zlatan",
        "folder": "Zlatan Ibrahimović Icon EA FC 26 - 98 - Rating and Price _ FUTBIN",
        "slug": "juve_zlatan",
        "overall": 89,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "سوئد",
        "prime_club": "Juventus",
        "club_logo": "packs/clubs/juventus.webp",
    },
]

LIVERPOOL_PLAYERS = [
    {
        "name": "X. Alonso",
        "folder": "Xabier Alonso Olano Icon EA FC 25 - 88 - Rating and Price _ FUTBIN",
        "slug": "liv_x_alonso",
        "overall": 88,
        "position": "DMF",
        "compatible_positions": "DMF, CMF",
        "nationality": "اسپانیا",
        "prime_club": "Liverpool",
        "club_logo": "packs/clubs/liverpool.webp",
    },
    {
        "name": "S. Gerrard",
        "folder": "Gerrard Icon EA FC 26 - 90 - Rating and Price _ FUTBIN",
        "slug": "liv_gerrard",
        "overall": 90,
        "position": "CMF",
        "compatible_positions": "CMF, AMF, RMF",
        "nationality": "انگلیس",
        "prime_club": "Liverpool",
        "club_logo": "packs/clubs/liverpool.webp",
    },
    {
        "name": "F. Torres",
        "folder": "Torres Sanz Icon EA FC 26 - 90 - Rating and Price _ FUTBIN",
        "slug": "liv_torres",
        "overall": 89,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "اسپانیا",
        "prime_club": "Liverpool",
        "club_logo": "packs/clubs/liverpool.webp",
    },
    {
        "name": "Suarez",
        "folder": "Luis Suárez EA FC 26 Ratings, Prices & Cards - FUT.GG",
        "slug": "liv_suarez",
        "overall": 89,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "اروگوئه",
        "prime_club": "Liverpool",
        "club_logo": "packs/clubs/liverpool.webp",
    },
    {
        "name": "D. Jota",
        "folder": "Diogo José Teixeira da Silva - EA FC card generations & ratings _ FUTBIN",
        "slug": "liv_jota",
        "overall": 86,
        "position": "CF",
        "compatible_positions": "CF, SS, LWF",
        "nationality": "پرتغال",
        "prime_club": "Liverpool",
        "club_logo": "packs/clubs/liverpool.webp",
    },
    {
        "name": "M. Owen",
        "folder": "Owen Icon EA FC 26 - 88 - Rating and Price _ FUTBIN",
        "slug": "liv_owen",
        "overall": 87,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "انگلیس",
        "prime_club": "Liverpool",
        "club_logo": "packs/clubs/liverpool.webp",
    },
]

MAN_UNITED_PLAYERS = [
    {
        "name": "P. Schmeichel",
        "folder": "Schmeichel Icon EA FC 26 - 89 - Rating and Price _ FUTBIN",
        "slug": "manu_schmeichel",
        "overall": 89,
        "position": "GK",
        "compatible_positions": "GK",
        "nationality": "دانمارک",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "R. Ferdinand",
        "folder": "Rio Ferdinand Icon EA FC 25 - 98 - Rating and Price _ FUTBIN",
        "slug": "manu_ferdinand",
        "overall": 88,
        "position": "CB",
        "compatible_positions": "CB",
        "nationality": "انگلیس",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "D. Beckham",
        "folder": "David Beckham Icon EA FC 25 - 88 - Rating and Price _ FUTBIN",
        "slug": "manu_beckham",
        "overall": 89,
        "position": "RMF",
        "compatible_positions": "RMF, RWF, CMF",
        "nationality": "انگلیس",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "C. Ronaldo",
        "folder": "cristiano ronaldo 2008 icon - Google Search",
        "slug": "manu_c_ronaldo",
        "overall": 93,
        "position": "RWF",
        "compatible_positions": "RWF, LWF, CF",
        "nationality": "پرتغال",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "R. Giggs",
        "folder": "Ryan Giggs Icon FIFA 22 - 93 - Rating and Price _ FUTBIN",
        "slug": "manu_giggs",
        "overall": 89,
        "position": "LMF",
        "compatible_positions": "LMF, LWF, AMF",
        "nationality": "ولز",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "P. Scholes",
        "folder": "Scholes Icon EA FC 26 - 91 - Rating and Price _ FUTBIN",
        "slug": "manu_scholes",
        "overall": 87,
        "position": "CMF",
        "compatible_positions": "CMF, AMF",
        "nationality": "انگلیس",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "E. Cantona",
        "folder": "Cantona Icon EA FC 26 - 92 - Rating and Price _ FUTBIN",
        "slug": "manu_cantona",
        "overall": 90,
        "position": "SS",
        "compatible_positions": "SS, CF, AMF",
        "nationality": "فرانسه",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "Van Nistelrooy",
        "folder": "van Nistelrooy Icon EA FC 26 - 89 - Rating and Price _ FUTBIN",
        "slug": "manu_van_nistelrooy",
        "overall": 90,
        "position": "CF",
        "compatible_positions": "CF, SS",
        "nationality": "هلند",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "Van der Sar",
        "folder": "van der Sar Icon EA FC 26 - 94 - Rating and Price _ FUTBIN",
        "slug": "manu_van_der_sar",
        "overall": 91,
        "position": "GK",
        "compatible_positions": "GK",
        "nationality": "هلند",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "W. Rooney",
        "folder": "Rooney Icon EA FC 26 - 92 - Rating and Price _ FUTBIN",
        "slug": "manu_rooney",
        "overall": 89,
        "position": "SS",
        "compatible_positions": "SS, CF, AMF",
        "nationality": "انگلیس",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
    {
        "name": "George Best",
        "folder": "George Best Icon FIFA 22 - 94 - Rating and Price _ FUTBIN",
        "slug": "manu_george_best",
        "overall": 92,
        "position": "RWF",
        "compatible_positions": "RWF, LWF, AMF",
        "nationality": "ایرلند شمالی",
        "prime_club": "Manchester United",
        "club_logo": "packs/clubs/manchester-united.webp",
    },
]


def seed_packs():
    print("=== Seeding Legendary Packs: Milan & Juventus + Liverpool & Man Utd ===")

    # 0. Clean up old unused mock Pack ID 9
    old_milan_pack = Pack.objects.filter(id=9).first()
    if old_milan_pack:
        if old_milan_pack.players.filter(is_claimed=True).count() == 0:
            print(f"[CLEANUP] Deleting old mock Pack ID 9: {old_milan_pack.name}")
            old_milan_pack.delete()
        else:
            old_milan_pack.is_active = False
            old_milan_pack.save(update_fields=['is_active'])
            print(f"[CLEANUP] Deactivated old Pack ID 9")

    # 1. Create / Update Milan & Juventus Pack
    milan_juve_base_dir = os.path.join(PROJECT_ROOT, "Legends pack", "AC Milan & Juventus")
    milan_juve_pack, mj_created = Pack.objects.update_or_create(
        name="پک اساطیر میلان و یوونتوس (Milan & Juventus Legends)",
        defaults={
            "tier": "LEGENDARY",
            "cover_image": "packs/covers/milan_juve_legends_cover.webp",
            "description": "پک شانس ویژه اسطوره‌های جاودانه سری آ شامل ۲۷ بازیکن برتر تاریخ باشگاه‌های میلان و یوونتوس.",
            "ovr_range_text": "OVR 87-93",
            "cost_gems": 100,
            "cost_usd": Decimal("0.00"),
            "cost_irr": 0,
            "purchase_method": "GEMS",
            "featured_team": "AC Milan / Juventus",
            "is_active": True,
            "sort_order": 3,
            "guarantee_min_ovr": 90,
            "weight_top_tier": 3,
            "weight_mid_tier": 5,
            "weight_base_tier": 8,
        }
    )
    status_str = "Created" if mj_created else "Updated"
    print(f"\n{status_str} Pack: {milan_juve_pack.name} (ID: {milan_juve_pack.id})")

    # Seed players for Milan & Juventus
    all_mj_players = MILAN_PLAYERS + JUVENTUS_PLAYERS
    for p in all_mj_players:
        img_rel = copy_player_image(milan_juve_base_dir, p["folder"], p["slug"])

        # We look up by pack, name, AND prime_club to allow duplicate names (e.g. Zlatan for Milan and Zlatan for Juve)
        player_obj, p_created = PackPlayer.objects.update_or_create(
            pack=milan_juve_pack,
            name=p["name"],
            prime_club=p["prime_club"],
            defaults={
                "position": p["position"],
                "compatible_positions": p["compatible_positions"],
                "overall": p["overall"],
                "potential_ovr": 99,
                "age": 50,
                "base_stamina": 85,
                "nationality": p["nationality"],
                "club_logo": p["club_logo"],
                "card_image": img_rel,
                "rarity": "LEGENDARY",
                "wage": Decimal("500.00"),
                "market_value": get_market_value(p["overall"]),
                "is_claimed": False,
            }
        )
        tag = "+" if p_created else "*"
        print(f"  [{tag}] [{p['prime_club']}] {player_obj.name} ({player_obj.position} OVR:{player_obj.overall}) -> {img_rel}")

    # 2. Create / Update Liverpool & Man United Pack
    liv_manu_base_dir = os.path.join(PROJECT_ROOT, "Legends pack", "liverpool & Manchester united")
    liv_manu_pack, lm_created = Pack.objects.update_or_create(
        name="پک اساطیر لیورپول و منچستریونایتد (Liverpool & Man United Legends)",
        defaults={
            "tier": "LEGENDARY",
            "cover_image": "packs/covers/liv_manu_legends_cover.webp",
            "description": "پک شانس ویژه اسطوره‌های جاودانه لیگ جزیره شامل ۱۷ بازیکن برتر تاریخ لیورپول و منچستریونایتد.",
            "ovr_range_text": "OVR 86-93",
            "cost_gems": 100,
            "cost_usd": Decimal("0.00"),
            "cost_irr": 0,
            "purchase_method": "GEMS",
            "featured_team": "Liverpool / Manchester United",
            "is_active": True,
            "sort_order": 4,
            "guarantee_min_ovr": 90,
            "weight_top_tier": 3,
            "weight_mid_tier": 5,
            "weight_base_tier": 8,
        }
    )
    status_str = "Created" if lm_created else "Updated"
    print(f"\n{status_str} Pack: {liv_manu_pack.name} (ID: {liv_manu_pack.id})")

    # Seed players for Liverpool & Man United
    all_lm_players = LIVERPOOL_PLAYERS + MAN_UNITED_PLAYERS
    for p in all_lm_players:
        img_rel = copy_player_image(liv_manu_base_dir, p["folder"], p["slug"])

        player_obj, p_created = PackPlayer.objects.update_or_create(
            pack=liv_manu_pack,
            name=p["name"],
            prime_club=p["prime_club"],
            defaults={
                "position": p["position"],
                "compatible_positions": p["compatible_positions"],
                "overall": p["overall"],
                "potential_ovr": 99,
                "age": 50,
                "base_stamina": 85,
                "nationality": p["nationality"],
                "club_logo": p["club_logo"],
                "card_image": img_rel,
                "rarity": "LEGENDARY",
                "wage": Decimal("500.00"),
                "market_value": get_market_value(p["overall"]),
                "is_claimed": False,
            }
        )
        tag = "+" if p_created else "*"
        print(f"  [{tag}] [{p['prime_club']}] {player_obj.name} ({player_obj.position} OVR:{player_obj.overall}) -> {img_rel}")

    print("\n=== SUMMARY ===")
    print(f"Milan & Juventus Pack Total Players: {milan_juve_pack.players.count()}")
    print(f"Liverpool & Man Utd Pack Total Players: {liv_manu_pack.players.count()}")


if __name__ == "__main__":
    seed_packs()
