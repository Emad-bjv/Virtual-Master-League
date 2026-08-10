import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from reset_to_real_data import reset_db

if __name__ == '__main__':
    reset_db()
