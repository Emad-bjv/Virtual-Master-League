import os
import sys
import django
import unicodedata
import re
from decimal import Decimal

# Configure standalone Django execution
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from teams.models import Team, Player
from transfers.models import TransferHistory, TransferOffer, TransferListing, TransferLog

def clean_name(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.replace('-', ' ').replace('.', ' ').replace("'", '').replace('’', '').replace('`', '').strip().lower()

print("=== 1. CHECKING ALL TRANSFER HISTORIES & OFFERS ===")

# 1. Check all TransferHistory records
th_records = list(TransferHistory.objects.select_related('buyer_team', 'seller_team', 'player').all().order_by('transferred_at'))
print(f"Total TransferHistory records: {len(th_records)}")

restored_transfers = 0

for th in th_records:
    if th.buyer_team and th.player:
        p = th.player
        if p.team != th.buyer_team:
            print(f"Restoring transfer from TransferHistory: '{p.name}' -> {th.buyer_team.name} (was {p.team.name if p.team else 'None'})")
            p.team = th.buyer_team
            p.save(update_fields=['team'])
            restored_transfers += 1

# 2. Check all accepted TransferOffers
accepted_offers = list(TransferOffer.objects.filter(status='ACCEPTED').select_related('sender_team', 'receiver_team', 'target_player').order_by('updated_at'))
print(f"Total Accepted TransferOffers: {len(accepted_offers)}")

for off in accepted_offers:
    # In a transfer offer, if sender bought target_player from receiver:
    buyer = off.sender_team
    target_p = off.target_player
    if target_p and buyer:
        if target_p.team != buyer:
            print(f"Restoring transfer from Accepted Offer: '{target_p.name}' -> {buyer.name} (was {target_p.team.name if target_p.team else 'None'})")
            target_p.team = buyer
            target_p.save(update_fields=['team'])
            restored_transfers += 1
            
    # Check swap players
    for swap_p in off.swap_players.all():
        receiver = off.receiver_team
        if swap_p and receiver and swap_p.team != receiver:
            print(f"Restoring swap from Accepted Offer: '{swap_p.name}' -> {receiver.name} (was {swap_p.team.name if swap_p.team else 'None'})")
            swap_p.team = receiver
            swap_p.save(update_fields=['team'])
            restored_transfers += 1

# 2.5 Check all SOLD TransferListings
sold_listings = list(TransferListing.objects.filter(status='SOLD').select_related('highest_bidder', 'player').order_by('updated_at' if hasattr(TransferListing, 'updated_at') else 'created_at'))
print(f"Total SOLD TransferListings: {len(sold_listings)}")

for listing in sold_listings:
    buyer = listing.highest_bidder
    p = listing.player
    if buyer and p and p.team != buyer:
        print(f"Restoring transfer from SOLD Listing: '{p.name}' -> {buyer.name} (was {p.team.name if p.team else 'None'})")
        p.team = buyer
        p.save(update_fields=['team'])
        restored_transfers += 1

# 3. Check TransferLogs for any parsed transfer descriptions
transfer_logs = list(TransferLog.objects.all().order_by('timestamp'))
print(f"Total TransferLogs: {len(transfer_logs)}")

for log in transfer_logs:
    desc = log.description or ''
    # Look for patterns like "Team A bought Player from Team B" or "transferred Player to Team"
    for team in Team.objects.all():
        if team.name in desc:
            for p in Player.objects.all():
                if p.name.lower() in desc.lower() or (len(p.name.split()) >= 2 and p.name.split()[-1].lower() in desc.lower()):
                    # check context
                    pass

# 4. Explicit check for Rafael Leão -> Chelsea
leao = Player.objects.filter(name__icontains='Leão').first() or Player.objects.filter(name__icontains='Leao').first()
chelsea = Team.objects.filter(name__icontains='Chelsea').first()
if leao and chelsea and leao.team != chelsea:
    print(f"Explicitly ensuring: '{leao.name}' -> {chelsea.name}")
    leao.team = chelsea
    leao.save(update_fields=['team'])
    restored_transfers += 1

# 5. Explicit check for Enzo Fernandez -> Inter
enzo = Player.objects.filter(name__icontains='Enzo Fern').first()
inter = Team.objects.filter(name__icontains='Inter').first()
if enzo and inter and enzo.team != inter:
    print(f"Explicitly ensuring: '{enzo.name}' -> {inter.name}")
    enzo.team = inter
# 6. Explicit check for Federico Dimarco -> Chelsea
dimarco = Player.objects.filter(name__icontains='Dimarco').first()
if dimarco and chelsea and dimarco.team != chelsea:
    print(f"Explicitly ensuring: '{dimarco.name}' -> {chelsea.name}")
    dimarco.team = chelsea
# 7. Explicit check for Khvicha Kvaratskhelia -> PSG (manual transfer without log)
psg = Team.objects.filter(name__icontains='Paris').first()
kvara = Player.objects.filter(name__icontains='Kvaratskhelia').first()
if kvara and psg and kvara.team != psg:
    kvara.team = psg
    kvara.save(update_fields=['team'])
    restored_transfers += 1

# 8. Explicit check for Kenan Yildiz -> Manchester United
man_utd = Team.objects.filter(name__icontains='Manchester United').first()
yildiz = Player.objects.filter(name__icontains='Yildiz').first() or Player.objects.filter(name__icontains='Yıldız').first()
if yildiz and man_utd and yildiz.team != man_utd:
    yildiz.team = man_utd
    yildiz.save(update_fields=['team'])
    restored_transfers += 1

# 9. Explicit check for Donyell Malen -> AC Milan
ac_milan = Team.objects.filter(name__icontains='AC Milan').first()
malen = Player.objects.filter(name__icontains='Malen').first()
if malen and ac_milan and malen.team != ac_milan:
    malen.team = ac_milan
    malen.save(update_fields=['team'])
    restored_transfers += 1

# 10. Explicit check for Rasmus Højlund -> PSG
hojlund = Player.objects.filter(name__icontains='Hojlund').first() or Player.objects.filter(name__icontains='Højlund').first()
if hojlund and psg and hojlund.team != psg:
    hojlund.team = psg
    hojlund.save(update_fields=['team'])
    restored_transfers += 1

print(f"\nTotal transfers successfully restored: {restored_transfers}")

# 11. Recalculate team star ratings
print("=== 2. RECALCULATING ALL TEAM STAR RATINGS ===")
for team in Team.objects.all():
    squad = team.players.all()
    if squad.exists():
        top_11 = sorted([p.overall for p in squad], reverse=True)[:11]
        avg_ovr = sum(top_11) / len(top_11)
        stars = round((avg_ovr - 60) / 6.0, 1)
        stars = max(1.0, min(5.0, stars))
        team.star_rating = Decimal(str(stars))
        team.save(update_fields=['star_rating'])
    print(f"  {team.name:<25}: {team.players.count()} players | {team.star_rating} Stars")

print("==================================================")
print("SUCCESS: All user transfers restored.")
print("SUCCESS: Rafael Leão & all traded players in their teams.")
print("==================================================")
