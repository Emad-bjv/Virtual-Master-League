import os, sys, django

sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player
from users.models import User
from matches.models import Match
from economy.models import StorePackage
from gacha.models import GachaPack
from transfers.models import TransferListing
from notifications.models import Notification

print("--- TEAMS ---")
for t in Team.objects.all():
    print(f"ID: {t.id}, Name: {t.name}, Logo: {t.logo}, Budget: {t.budget}")

print(f"\nTotal Players: {Player.objects.count()}")

print("\n--- USERS ---")
for u in User.objects.all():
    team_name = None
    try:
        if u.team:
            team_name = u.team.name
    except Exception:
        pass
    print(f"ID: {u.id}, Phone: {u.phone_number}, Team: {team_name}")

print(f"\nTotal Matches: {Match.objects.count()}")
for m in Match.objects.all():
    print(f"Match ID: {m.id}, {m.home_team} vs {m.away_team}, status: {m.status}")

print(f"\nTotal Transfer Listings: {TransferListing.objects.count()}")
for tl in TransferListing.objects.all():
    print(f"Transfer ID: {tl.id}, Player: {tl.player.name if tl.player else 'None'}, Price: {tl.price_usd}")

print(f"\nTotal Store Packages: {StorePackage.objects.count()}")
for sp in StorePackage.objects.all():
    print(f"Store Package: {sp.name}, Active: {sp.is_active}")

print(f"\nTotal Gacha Packs: {GachaPack.objects.count()}")
for gp in GachaPack.objects.all():
    print(f"Gacha Pack: {gp.name}, Active: {gp.is_active}")

print(f"\nTotal Notifications: {Notification.objects.count()}")
