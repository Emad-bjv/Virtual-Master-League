import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=25)

script = """
import sys
from datetime import datetime, timezone
from decimal import Decimal
from django.db import transaction
from teams.models import Player, Team
from transfers.models import TransferHistory

sys.stdout.reconfigure(encoding='utf-8')

with transaction.atomic():
    teams = {t.name: t for t in Team.objects.all()}
    def get_team(name):
        for k, v in teams.items():
            if name.lower() in k.lower():
                return v
        raise ValueError(f"Team {name} not found")

    psg = get_team('Paris')
    as_roma = get_team('AS Roma')
    napoli = get_team('Napoli')
    tottenham = get_team('Tottenham')
    chelsea = get_team('Chelsea')
    man_utd = get_team('Manchester United')
    inter = get_team('Inter')

    # List of swap corrections:
    # (player_id, target_team, seller_team, buyer_team, transfer_type, timestamp_str)
    # Note: swap player moves FROM buyer TO seller!
    swap_fixes = [
        # 1. Harry Kane (841): Napoli -> PSG (Sep 11 11:19:39)
        (841, psg, napoli, psg, 'SWAP', '2026-09-11 11:19:39+00:00'),
        
        # 2. Eduardo Camavinga (1116): Napoli -> AS Roma (Aug 29 19:50:00)
        (1116, as_roma, napoli, as_roma, 'SWAP', '2026-08-29 19:50:00+00:00'),
        
        # 3. Aurélien Tchouaméni (1112): PSG -> Napoli (Sep 14 07:45:32)
        (1112, napoli, psg, napoli, 'SWAP', '2026-09-14 07:45:32+00:00'),
        
        # 4. Arda Güler (1118): Real Madrid -> Tottenham (Sep 12 17:04:33)
        (1118, tottenham, get_team('Real Madrid'), tottenham, 'SWAP', '2026-09-12 17:04:33+00:00'),
        
        # 5. Kevin Danso (1144): Real Madrid -> Napoli (Sep 13 11:13:01)
        (1144, napoli, get_team('Real Madrid'), napoli, 'SWAP', '2026-09-13 11:13:01+00:00'),
        
        # 6. Ferland Mendy (1105): Real Madrid -> Napoli (Sep 13 11:13:01)
        (1105, napoli, get_team('Real Madrid'), napoli, 'SWAP', '2026-09-13 11:13:01+00:00'),
        
        # 7. Matthijs de Ligt (1021): Man Utd -> Chelsea (Sep 11 21:37:44)
        (1021, chelsea, man_utd, chelsea, 'SWAP', '2026-09-11 21:37:44+00:00'),
        
        # 8. Mason Mount (1020): Chelsea -> AS Roma (Sep 12 15:23:24)
        (1020, as_roma, chelsea, as_roma, 'SWAP', '2026-09-12 15:23:24+00:00'),
        
        # 9. Manuel Ugarte (1029): Man Utd -> AS Roma (Sep 12 15:13:25)
        (1029, as_roma, man_utd, as_roma, 'SWAP', '2026-09-12 15:13:25+00:00'),
        
        # 10. Matheus Cunha (1025): Man Utd -> AS Roma (Sep 11 18:50:32)
        (1025, as_roma, man_utd, as_roma, 'SWAP', '2026-09-11 18:50:32+00:00'),
        
        # 11. Scott McTominay (1215): Chelsea -> Man Utd (Sep 12 14:29:08)
        (1215, man_utd, chelsea, man_utd, 'SWAP', '2026-09-12 14:29:08+00:00'),
        
        # 12. Bruno Guimarães (1066): Inter -> AS Roma (Aug 29 09:34:32)
        (1066, as_roma, inter, as_roma, 'SWAP', '2026-08-29 09:34:32+00:00'),
        
        # 13. Joelinton (1058): AS Roma -> Man Utd (Aug 28 10:29:18)
        (1058, man_utd, as_roma, man_utd, 'SWAP', '2026-08-28 10:29:18+00:00'),
    ]

    for pid, target_team, s_team, b_team, t_type, t_str in swap_fixes:
        p = Player.objects.get(id=pid)
        p.team = target_team
        p.pes_transfer_applied = False # Mark pending for PES coordinator
        p.save(update_fields=['team', 'pes_transfer_applied'])
        
        dt = datetime.fromisoformat(t_str)
        # Create TH if not exists
        th, created = TransferHistory.objects.get_or_create(
            player=p,
            seller_team=s_team,
            buyer_team=b_team,
            transfer_type=t_type,
            defaults={
                'price_usd': Decimal('0.00'),
                'transferred_at': dt
            }
        )
        # Always update transferred_at to bypass auto_now_add
        TransferHistory.objects.filter(id=th.id).update(transferred_at=dt)
        print(f"[OK] {p.name} (ID {p.id}) -> {target_team.name} | TH {th.id} [{dt}]")

print("\\nALL SWAP FIXES APPLIED SUCCESSFULLY!")
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
