import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from transfers.models import TransferLog
from teams.models import Player, Team

def check():
    logs = TransferLog.objects.all().order_by('timestamp')
    for log in logs:
        if not log.description: continue
        desc = log.description
        if 'Kvara' in desc or 'kvara' in desc.lower() or 'کوارا' in desc:
            print("Kvara Log:", desc)
        if 'Yıldız' in desc or 'yildiz' in desc.lower() or 'ییلدیز' in desc:
            print("Yildiz Log:", desc)
        if 'Malen' in desc or 'malen' in desc.lower() or 'مالن' in desc:
            print("Malen Log:", desc)
        if 'Højlund' in desc or 'hojlund' in desc.lower() or 'هویلوند' in desc:
            print("Hojlund Log:", desc)

if __name__ == "__main__":
    check()
