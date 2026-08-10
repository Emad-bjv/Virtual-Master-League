import os
import sys
import unittest
from decimal import Decimal

# Ensure backend directory is in sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Setup Django environment if not configured
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

try:
    django.setup()
    call_command('migrate', verbosity=0)
except Exception:
    pass

from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


class DummyResponse:
    def __init__(self, status_code, json_data=None, content=b""):
        self.status_code = status_code
        self._json_data = json_data or {}
        self.content = content

    def json(self):
        return self._json_data


class VMLTestHarness(TestCase):
    """
    Unified VML Test Harness supporting both direct DRF APIClient requests
    and Django DB model operations. Compatible with standard unittest.TestCase runner.
    """

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.auth_token = None

    def create_user(self, phone_number=None, virtual_dollars=Decimal("1000.00"), **kwargs):
        if phone_number is None:
            phone_number = f"09{User.objects.count() + 100000000}"
        if not isinstance(virtual_dollars, Decimal):
            virtual_dollars = Decimal(str(virtual_dollars))
        return User.objects.create_user(phone_number=phone_number, virtual_dollars=virtual_dollars, **kwargs)

    def create_team(self, manager=None, name=None, budget=1000000.00, **kwargs):
        from teams.models import Team
        if manager is None:
            manager = self.create_user()
        if name is None:
            name = f"Test Team {Team.objects.count() + 1}"
        return Team.objects.create(manager=manager, name=name, budget=budget, **kwargs)

    def create_player(self, team=None, name="Test Player", position="CF", overall=75, age=24, base_stamina=80, potential_ovr=85, virtual_stamina=100.00, **kwargs):
        from teams.models import Player
        return Player.objects.create(
            team=team,
            name=name,
            position=position,
            overall=overall,
            age=age,
            base_stamina=base_stamina,
            potential_ovr=potential_ovr,
            virtual_stamina=virtual_stamina,
            **kwargs
        )

    def set_token(self, token: str):
        self.auth_token = token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def get_auth_headers(self) -> dict:
        if self.auth_token:
            return {'HTTP_AUTHORIZATION': f'Bearer {self.auth_token}'}
        return {}

    def get(self, path, params=None, headers=None, **extra):
        kw = extra.copy()
        if headers:
            kw.update(headers)
        return self.client.get(path, data=params, **kw)

    def post(self, path, data=None, headers=None, format='json', **extra):
        kw = extra.copy()
        if headers:
            kw.update(headers)
        return self.client.post(path, data=data, format=format, **kw)

    def put(self, path, data=None, headers=None, format='json', **extra):
        kw = extra.copy()
        if headers:
            kw.update(headers)
        return self.client.put(path, data=data, format=format, **kw)

    def patch(self, path, data=None, headers=None, format='json', **extra):
        kw = extra.copy()
        if headers:
            kw.update(headers)
        return self.client.patch(path, data=data, format=format, **kw)

    def delete(self, path, headers=None, **extra):
        kw = extra.copy()
        if headers:
            kw.update(headers)
        return self.client.delete(path, **kw)

    def assert_status_code(self, response, expected_code):
        self.assertEqual(
            response.status_code, expected_code,
            f"Expected status {expected_code}, got {response.status_code}. Data: {getattr(response, 'data', response.content)}"
        )

    def assert_json_structure(self, response, expected_keys):
        data = response.data if hasattr(response, 'data') else response.json()
        if isinstance(data, list):
            self.assertTrue(len(data) >= 0, "Response JSON is list")
            if len(data) > 0 and isinstance(data[0], dict):
                for k in expected_keys:
                    self.assertIn(k, data[0], f"Key {k} missing from response list element")
        elif isinstance(data, dict):
            for k in expected_keys:
                self.assertIn(k, data, f"Key {k} missing from response object")

    def assert_error_code(self, response, expected_status):
        self.assertEqual(response.status_code, expected_status)
