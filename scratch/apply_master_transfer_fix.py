import paramiko, sys, json
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=30)

script = """
import sys
from datetime import datetime, timezone
from decimal import Decimal
from django.db import transaction
from transfers.models import TransferOffer, TransferHistory, TransferLog
from teams.models import Player, Team

sys.stdout.reconfigure(encoding='utf-8')

with transaction.atomic():
    print("=== STEP 1: Deleting corrupt synthetic TransferHistory records (592 to 662) ===")
    deleted_th, _ = TransferHistory.objects.filter(id__gte=592, id__lte=662).delete()
    print(f"Deleted {deleted_th} TransferHistory records.")

    print("\\n=== STEP 2: Deleting corrupt synthetic TransferLogs from 09:12 batch ===")
    t_start = datetime(2026, 9, 17, 9, 12, 40, tzinfo=timezone.utc)
    t_end = datetime(2026, 9, 17, 9, 12, 45, tzinfo=timezone.utc)
    deleted_logs, _ = TransferLog.objects.filter(timestamp__gte=t_start, timestamp__lte=t_end).delete()
    print(f"Deleted {deleted_logs} corrupt TransferLog records.")

    print("\\n=== STEP 3: Restoring 51 affected players to authentic teams ===")
    # Load teams
    teams = {t.name: t for t in Team.objects.all()}
    def get_team(name):
        for k, v in teams.items():
            if name.lower() in k.lower():
                return v
        raise ValueError(f"Team {name} not found")

    liverpool = get_team('Liverpool')
    real_madrid = get_team('Real Madrid')
    man_utd = get_team('Manchester United')
    tottenham = get_team('Tottenham')
    as_roma = get_team('AS Roma')
    chelsea = get_team('Chelsea')
    inter = get_team('Inter')
    napoli = get_team('Napoli')
    juventus = get_team('Juventus')
    barcelona = get_team('Barcelona')
    atletico = get_team('Atlético')
    newcastle = get_team('Newcastle')
    bvb = get_team('Dortmund')
    man_city = get_team('Manchester City')
    psg = get_team('Paris')

    # Mapping: player_id -> (target_team, is_free_agent, is_recent_pending)
    corrections = {
        # Released Free Agents
        264: (None, True, True),   # Mamadou Sarr (released Sep 12)
        265: (None, True, True),   # T. Sharman-Lowe (released Sep 11)
        829: (None, True, False),  # Roméo Lavia (released Aug 25)
        830: (None, True, False),  # Malang Sarr (released Aug 27)
        835: (None, True, False),  # Josh Acheampong (released Aug 29)
        1033: (None, True, False), # Leny Yoro (released Aug 26)
        1178: (None, True, True),  # Bryan Cristante (released Sep 11)
        1205: (None, True, True),  # Juan Jesus (released Sep 12)
        1225: (None, True, False), # Antonio Vergara (released Aug 27)

        # Restored to Clubs
        266: (as_roma, False, False),      # André Onana -> AS Roma (Aug 29)
        776: (as_roma, False, True),       # Alexander Sørloth -> AS Roma (Sep 11)
        779: (tottenham, False, True),     # Ademola Lookman -> Tottenham (Sep 12)
        797: (as_roma, False, False),      # Gregor Kobel -> AS Roma (Aug 29)
        812: (inter, False, False),        # Enzo Fernández -> Inter (Aug 27)
        816: (as_roma, False, True),       # Pedro Neto -> AS Roma (Sep 11)
        819: (chelsea, False, False),      # Trevoh Chalobah -> Chelsea (Aug 29)
        821: (inter, False, False),        # Levi Colwill -> Inter (Aug 26)
        841: (napoli, False, False),       # Harry Kane -> SSC Napoli (Aug 29)
        844: (inter, False, False),        # Jamal Musiala -> Inter (Aug 29)
        894: (as_roma, False, False),      # Ronald Araújo -> AS Roma (Aug 28)
        907: (chelsea, False, False),      # Federico Dimarco -> Chelsea (Aug 27)
        911: (man_utd, False, True),       # Alessandro Bastoni -> Man Utd (Sep 11)
        928: (bvb, False, False),          # Yann Sommer -> BVB Dortmund (Aug 27)
        933: (psg, False, True),           # Hakan Çalhanoğlu -> PSG (Sep 14)
        951: (chelsea, False, False),      # Dušan Vlahović -> Chelsea (Aug 28)
        961: (real_madrid, False, True),   # Mohamed Salah -> Real Madrid (Sep 16)
        970: (barcelona, False, False),    # Ibrahima Konaté -> FC Barcelona (Aug 29)
        1006: (real_madrid, False, True),  # Jérémy Doku -> Real Madrid (Sep 14)
        1020: (man_utd, False, False),     # Mason Mount -> Man Utd (Base)
        1021: (man_utd, False, False),     # Matthijs de Ligt -> Man Utd (Base)
        1025: (man_utd, False, False),     # Matheus Cunha -> Man Utd (Base)
        1026: (atletico, False, False),    # Bryan Mbeumo -> Atlético Madrid (Aug 27)
        1029: (man_utd, False, False),     # Manuel Ugarte -> Man Utd (Base)
        1045: (newcastle, False, True),    # Casemiro -> Newcastle United (Sep 11)
        1058: (as_roma, False, False),     # Joelinton -> AS Roma (Aug 27)
        1066: (inter, False, False),       # Bruno Guimarães -> Inter (Aug 26)
        1089: (psg, False, False),         # Matvey Safonov -> PSG (Aug 29)
        1096: (man_city, False, False),    # Gonçalo Ramos -> Manchester City (Aug 28)
        1098: (barcelona, False, True),    # Bradley Barcola -> FC Barcelona (Sep 11)
        1105: (real_madrid, False, False), # Ferland Mendy -> Real Madrid (Base)
        1112: (psg, False, False),         # Aurélien Tchouaméni -> PSG (Aug 25)
        1113: (liverpool, False, True),    # Rodrygo -> Liverpool (Sep 16)
        1116: (napoli, False, False),      # Eduardo Camavinga -> SSC Napoli (Aug 29)
        1118: (real_madrid, False, False), # Arda Güler -> Real Madrid (Base)
        1138: (as_roma, False, False),     # David Alaba -> AS Roma (Aug 28)
        1140: (liverpool, False, True),    # Antonio Rüdiger -> Liverpool (Sep 11)
        1144: (real_madrid, False, False), # Kevin Danso -> Real Madrid (Aug 29)
        1190: (man_utd, False, True),      # Artem Dovbyk -> Man Utd (Sep 13)
        1203: (man_utd, False, True),      # Romelu Lukaku -> Man Utd (Sep 12)
        1208: (newcastle, False, True),    # Stanislav Lobotka -> Newcastle (Sep 11)
        1213: (tottenham, False, False),   # Frank Anguissa -> Tottenham Hotspur (Aug 29)
        1215: (chelsea, False, False),     # Scott McTominay -> Chelsea (Aug 26)
        1224: (as_roma, False, True),      # Sam Beukema -> AS Roma (Sep 11)
    }

    updated_count = 0
    for pid, (target_team, is_fa, is_pending) in corrections.items():
        p = Player.objects.filter(id=pid).first()
        if not p:
            print(f"WARNING: Player {pid} not found!")
            continue
        p.team = target_team
        p.pes_transfer_applied = not is_pending
        p.save(update_fields=['team', 'pes_transfer_applied'])
        dest_name = target_team.name if target_team else 'Free Agent'
        print(f"  [OK] Player {p.name} ({p.id}) set to {dest_name} | pes_pending={is_pending}")
        updated_count += 1

    print(f"\\nUpdated {updated_count} players.")

    print("\\n=== STEP 4: Creating authentic missing TransferHistory records for swap players ===")
    # 1. Rodrygo: Real Madrid -> Liverpool on 2026-09-16 06:28:59
    rodrygo = Player.objects.get(id=1113)
    th_rodrygo, created = TransferHistory.objects.get_or_create(
        player=rodrygo,
        seller_team=real_madrid,
        buyer_team=liverpool,
        transfer_type='SWAP',
        defaults={
            'price_usd': Decimal('0.00'),
            'transferred_at': datetime(2026, 9, 16, 6, 28, 59, tzinfo=timezone.utc)
        }
    )
    if not created:
        th_rodrygo.transferred_at = datetime(2026, 9, 16, 6, 28, 59, tzinfo=timezone.utc)
        th_rodrygo.save(update_fields=['transferred_at'])
    print(f"Rodrygo TH: ID {th_rodrygo.id} [{th_rodrygo.transferred_at}]")

    # 2. Jérémy Doku: SSC Napoli -> Real Madrid on 2026-09-14 08:46:49
    doku = Player.objects.get(id=1006)
    th_doku, created = TransferHistory.objects.get_or_create(
        player=doku,
        seller_team=napoli,
        buyer_team=real_madrid,
        transfer_type='SWAP',
        defaults={
            'price_usd': Decimal('0.00'),
            'transferred_at': datetime(2026, 9, 14, 8, 46, 49, tzinfo=timezone.utc)
        }
    )
    if not created:
        th_doku.transferred_at = datetime(2026, 9, 14, 8, 46, 49, tzinfo=timezone.utc)
        th_doku.save(update_fields=['transferred_at'])
    print(f"Doku TH: ID {th_doku.id} [{th_doku.transferred_at}]")

    # 3. Kevin Danso: Tottenham Hotspur -> Real Madrid on 2026-08-29 21:24:44
    danso = Player.objects.get(id=1144)
    th_danso, created = TransferHistory.objects.get_or_create(
        player=danso,
        seller_team=tottenham,
        buyer_team=real_madrid,
        transfer_type='SWAP',
        defaults={
            'price_usd': Decimal('0.00'),
            'transferred_at': datetime(2026, 8, 29, 21, 24, 44, tzinfo=timezone.utc)
        }
    )
    if not created:
        th_danso.transferred_at = datetime(2026, 8, 29, 21, 24, 44, tzinfo=timezone.utc)
        th_danso.save(update_fields=['transferred_at'])
    print(f"Danso TH: ID {th_danso.id} [{th_danso.transferred_at}]")

    # 4. David Alaba: Manchester United -> AS Roma on 2026-08-28 15:07:18
    alaba = Player.objects.get(id=1138)
    th_alaba, created = TransferHistory.objects.get_or_create(
        player=alaba,
        seller_team=man_utd,
        buyer_team=as_roma,
        transfer_type='SWAP',
        defaults={
            'price_usd': Decimal('0.00'),
            'transferred_at': datetime(2026, 8, 28, 15, 7, 18, tzinfo=timezone.utc)
        }
    )
    if not created:
        th_alaba.transferred_at = datetime(2026, 8, 28, 15, 7, 18, tzinfo=timezone.utc)
        th_alaba.save(update_fields=['transferred_at'])
    print(f"Alaba TH: ID {th_alaba.id} [{th_alaba.transferred_at}]")

    print("\\n=== TRANSACTION COMPLETE SUCCESSFULLY! ===")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print("STDOUT:")
print(out)
if err:
    print("STDERR:")
    print(err)
client.close()
