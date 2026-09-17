import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('37.32.36.252', username='ubuntu', password='1017#Emad', timeout=20)

script = """
from transfers.models import TransferOffer

swap_offers = TransferOffer.objects.filter(status='ACCEPTED', offer_type='SWAP').order_by('updated_at', 'id')
print(f"Total accepted swap offers: {swap_offers.count()}")
for o in swap_offers:
    sp_names = [p.name for p in o.swap_players.all()]
    print(f"Offer {o.id} [{o.updated_at}]: {o.sender_team.name} -> {o.receiver_team.name} | Target: {o.target_player.name if o.target_player else 'None'} | Swaps: {sp_names}")
"""

escaped = script.replace('"', '\\"')
cmd = f"cd /opt/vml && docker compose exec -T backend python manage.py shell -c \"{escaped}\""
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
