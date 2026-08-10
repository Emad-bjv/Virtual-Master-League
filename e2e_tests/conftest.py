import os
import sys

e2e_dir = os.path.dirname(os.path.abspath(__file__))
if e2e_dir not in sys.path:
    sys.path.insert(0, e2e_dir)

backend_dir = os.path.abspath(os.path.join(e2e_dir, '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
from django.conf import settings
from django.core.management import call_command

settings.ALLOWED_HOSTS = ['*']
settings.DATABASES['default'] = {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': ':memory:',
    'ATOMIC_REQUESTS': False,
}

django.setup()
try:
    call_command('migrate', verbosity=0)
except Exception:
    pass
