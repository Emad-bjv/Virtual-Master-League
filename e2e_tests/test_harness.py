"""
Virtual Master League (VML) E2E Test Harness.

Provides `VMLTestHarness`, a unified test case base class that handles:
- Base REST API URL setup (default: http://127.0.0.1:9000/api).
- Dynamic execution engine: uses live HTTP requests when backend server is running,
  or falls back seamlessly to an in-memory Django REST Framework APIClient.
- JWT Bearer auth token manager (`set_token`, `get_auth_headers`, `clear_token`).
- Unified response object (`VMLResponse`).
- Standardized assertion helpers (`assert_status_code`, `assert_json_structure`, `assert_error_code`).
"""

import os
import sys
import json
import unittest
import urllib.request
import urllib.parse
import urllib.error

# Module-level singletons for Django in-memory fallback
_DJANGO_INITIALIZED = False
_DJANGO_CLIENT = None


class VMLResponse:
    """
    Unified response wrapper for both HTTP requests and Django APIClient responses.
    """
    def __init__(self, status_code, data=None, text="", headers=None, content=b""):
        self.status_code = status_code
        self._data = data
        self.text = text
        self.content = content
        self.headers = headers or {}

    def json(self):
        """Return parsed JSON object or attempt parsing text."""
        if self._data is not None:
            return self._data
        if self.text:
            try:
                return json.loads(self.text)
            except Exception:
                return {"detail": self.text}
        return {}

    def __repr__(self):
        return f"<VMLResponse [{self.status_code}]>"


def _is_postgres_running(host="127.0.0.1", port=5432):
    """Check if PostgreSQL server is listening on target host/port."""
    import socket
    try:
        s = socket.create_connection((host, int(port)), timeout=0.5)
        s.close()
        return True
    except Exception:
        return False


def _setup_django_environment():
    """
    Initializes Django settings and returns an in-memory DRF APIClient instance.
    If PostgreSQL database connection is unavailable, automatically configures
    an in-memory SQLite database and applies migrations before setup.
    """
    global _DJANGO_INITIALIZED, _DJANGO_CLIENT
    if _DJANGO_INITIALIZED and _DJANGO_CLIENT is not None:
        return _DJANGO_CLIENT

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    backend_dir = os.path.join(project_root, "backend")
    venv_site = os.path.join(backend_dir, "venv", "Lib", "site-packages")

    if os.path.exists(venv_site) and venv_site not in sys.path:
        sys.path.insert(0, venv_site)
    if os.path.exists(backend_dir) and backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    import django
    from django.conf import settings

    # Check PostgreSQL availability; switch to sqlite in-memory if offline
    if not _is_postgres_running():
        settings.DATABASES['default'] = {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': 'file:vml_test_db?mode=memory&cache=shared',
            'TEST': {
                'NAME': 'file:vml_test_db?mode=memory&cache=shared',
            },
            'ATOMIC_REQUESTS': False,
        }
    else:
        if isinstance(settings.DATABASES.get('default'), dict):
            settings.DATABASES['default']['ATOMIC_REQUESTS'] = False

    if 'testserver' not in settings.ALLOWED_HOSTS:
        settings.ALLOWED_HOSTS.extend(['testserver', 'localhost', '127.0.0.1', '*'])

    if not settings.configured:
        django.setup()
    else:
        try:
            django.setup()
        except RuntimeError:
            pass  # Already setup

    if settings.DATABASES['default']['ENGINE'] == 'django.db.backends.sqlite3':
        from django.core.management import call_command
        call_command('migrate', verbosity=0)

    try:
        from rest_framework.test import APIClient
        _DJANGO_CLIENT = APIClient()
    except ImportError:
        from django.test import Client
        _DJANGO_CLIENT = Client()

    _DJANGO_INITIALIZED = True
    return _DJANGO_CLIENT


def _check_server_online(base_url):
    """
    Pings the target REST API URL to check if a live server is running.
    """
    try:
        parsed = urllib.parse.urlparse(base_url)
        check_url = f"{parsed.scheme}://{parsed.netloc}/"
        req = urllib.request.Request(check_url, method='HEAD')
        with urllib.request.urlopen(req, timeout=0.8) as resp:
            return True
    except urllib.error.HTTPError:
        # HTTP response received (e.g. 404/403) means server is online
        return True
    except Exception:
        return False


from django.test import TestCase


class VMLTestHarness(TestCase):
    """
    Base test class for Virtual Master League E2E integration tests.
    """
    base_url = "http://127.0.0.1:9000/api"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        env_url = os.environ.get("VML_API_URL")
        if env_url:
            cls.base_url = env_url.rstrip("/")
        else:
            cls.base_url = "http://127.0.0.1:9000/api"

        cls.use_live_server = _check_server_online(cls.base_url)
        if not cls.use_live_server:
            cls.django_client = _setup_django_environment()
        else:
            cls.django_client = None

    def setUp(self):
        super().setUp()
        self.token = None
        if self.django_client and hasattr(self.django_client, 'credentials'):
            self.django_client.credentials()
        if self.django_client and hasattr(self.django_client, 'force_authenticate'):
            self.django_client.force_authenticate(user=None)

    def tearDown(self):
        super().tearDown()
        self.token = None
        if self.django_client and hasattr(self.django_client, 'credentials'):
            self.django_client.credentials()
        if self.django_client and hasattr(self.django_client, 'force_authenticate'):
            self.django_client.force_authenticate(user=None)

    # --- Auth Token Management ---
    @property
    def client(self):
        return self.django_client

    def create_user(self, username=None, phone_number="09123456789", virtual_dollars=1000.00, role="coach", **kwargs):
        from users.models import User
        uname = username or phone_number
        if not uname:
            uname = f"user_{User.objects.count() + 1}"
        from decimal import Decimal
        if not isinstance(virtual_dollars, Decimal):
            virtual_dollars = Decimal(str(virtual_dollars))
        return User.objects.create_user(username=uname, virtual_dollars=virtual_dollars, role=role, **kwargs)

    def authenticate(self, user):
        if self.django_client and hasattr(self.django_client, 'force_authenticate'):
            self.django_client.force_authenticate(user=user)
        return user

    def authenticate_as_admin(self, admin_user=None):
        if admin_user is None:
            admin_user = self.create_user(role="admin", is_staff=True)
        if self.django_client and hasattr(self.django_client, 'force_authenticate'):
            self.django_client.force_authenticate(user=admin_user)
        return admin_user

    def authenticate_as_coach(self, coach_user=None, team=None):
        if coach_user is None:
            coach_user = self.create_user(role="coach")
        if team is not None:
            team.manager = coach_user
            team.save()
        if self.django_client and hasattr(self.django_client, 'force_authenticate'):
            self.django_client.force_authenticate(user=coach_user)
        return coach_user

    def create_team(self, manager=None, name="Test Team", budget=1000000.00, **kwargs):
        from teams.models import Team
        return Team.objects.create(manager=manager, name=name, budget=budget, **kwargs)

    def create_player(self, team=None, name="Test Player", position="CF", overall=75, age=24, base_stamina=80, potential_ovr=85, virtual_stamina=100.0, **kwargs):
        from teams.models import Player
        return Player.objects.create(
            team=team, name=name, position=position, overall=overall,
            age=age, base_stamina=base_stamina, potential_ovr=potential_ovr,
            virtual_stamina=virtual_stamina, **kwargs
        )

    def set_token(self, token: str):
        """Set active JWT auth bearer token."""
        self.token = token

    def clear_token(self):
        """Clear active JWT auth bearer token."""
        self.token = None

    def get_auth_headers(self) -> dict:
        """Return Authorization header dictionary if token is set."""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    # --- URL Normalization ---
    def _normalize_endpoint(self, endpoint: str) -> tuple[str, str]:
        """
        Normalizes endpoint path.
        Returns tuple: (relative_api_path, full_http_url)
        e.g., endpoint='/users/me/' -> ('/api/users/me/', 'http://127.0.0.1:9000/api/users/me/')
        """
        if endpoint.startswith("http://") or endpoint.startswith("https://"):
            full_url = endpoint
            parsed = urllib.parse.urlparse(endpoint)
            rel_path = parsed.path
            return rel_path, full_url

        clean_path = endpoint.lstrip("/")
        if clean_path.startswith("api/"):
            rel_path = "/" + clean_path
        else:
            rel_path = "/api/" + clean_path

        base_clean = self.base_url.rstrip("/")
        if base_clean.endswith("/api") and rel_path.startswith("/api/"):
            full_url = base_clean[:-4] + rel_path
        else:
            full_url = base_clean + "/" + clean_path

        return rel_path, full_url

    # --- Request Dispatcher ---
    def _make_request(self, method: str, endpoint: str, data=None, json_payload=None, params=None, headers=None) -> VMLResponse:
        req_headers = self.get_auth_headers()
        if headers:
            req_headers.update(headers)

        rel_path, full_url = self._normalize_endpoint(endpoint)

        if self.use_live_server:
            return self._make_http_request(method, full_url, data=data, json_payload=json_payload, params=params, headers=req_headers)
        else:
            return self._make_in_memory_request(method, rel_path, data=data, json_payload=json_payload, params=params, headers=req_headers)

    def _make_http_request(self, method: str, full_url: str, data=None, json_payload=None, params=None, headers=None) -> VMLResponse:
        """Execute request via Python urllib or requests library to live backend."""
        try:
            import requests
            kwargs = {'headers': headers or {}}
            if params:
                kwargs['params'] = params
            if json_payload is not None:
                kwargs['json'] = json_payload
            elif data is not None:
                kwargs['data'] = data

            resp = requests.request(method, full_url, **kwargs)
            try:
                data_json = resp.json()
            except Exception:
                data_json = None

            return VMLResponse(
                status_code=resp.status_code,
                data=data_json,
                text=resp.text,
                content=resp.content,
                headers=dict(resp.headers)
            )
        except ImportError:
            # Fallback to urllib if requests is not installed
            if params:
                query_str = urllib.parse.urlencode(params)
                full_url = f"{full_url}?{query_str}"

            body_bytes = None
            req_headers = headers or {}
            if json_payload is not None:
                body_bytes = json.dumps(json_payload).encode('utf-8')
                req_headers['Content-Type'] = 'application/json'
            elif data is not None:
                if isinstance(data, dict):
                    body_bytes = urllib.parse.urlencode(data).encode('utf-8')
                    req_headers['Content-Type'] = 'application/x-www-form-urlencoded'
                elif isinstance(data, str):
                    body_bytes = data.encode('utf-8')
                elif isinstance(data, bytes):
                    body_bytes = data

            req = urllib.request.Request(full_url, data=body_bytes, headers=req_headers, method=method)
            try:
                with urllib.request.urlopen(req) as resp:
                    resp_bytes = resp.read()
                    text = resp_bytes.decode('utf-8', errors='replace')
                    try:
                        resp_data = json.loads(text)
                    except Exception:
                        resp_data = None
                    return VMLResponse(
                        status_code=resp.status,
                        data=resp_data,
                        text=text,
                        content=resp_bytes,
                        headers=dict(resp.headers)
                    )
            except urllib.error.HTTPError as err:
                err_bytes = err.read()
                text = err_bytes.decode('utf-8', errors='replace')
                try:
                    resp_data = json.loads(text)
                except Exception:
                    resp_data = None
                return VMLResponse(
                    status_code=err.code,
                    data=resp_data,
                    text=text,
                    content=err_bytes,
                    headers=dict(err.headers)
                )

    def _make_in_memory_request(self, method: str, rel_path: str, data=None, json_payload=None, params=None, headers=None) -> VMLResponse:
        """Execute request using in-memory Django test client."""
        client = self.django_client

        # Convert headers for Django Client/APIClient
        extra = {}
        if headers:
            for k, v in headers.items():
                header_key = k.upper().replace('-', '_')
                if header_key in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
                    extra[header_key] = v
                else:
                    extra[f'HTTP_{header_key}'] = v

        if hasattr(client, 'credentials'):
            if 'HTTP_AUTHORIZATION' in extra:
                client.credentials(HTTP_AUTHORIZATION=extra['HTTP_AUTHORIZATION'])
            else:
                client.credentials()

        if params:
            query_str = urllib.parse.urlencode(params)
            rel_path = f"{rel_path}?{query_str}" if "?" not in rel_path else f"{rel_path}&{query_str}"

        method_name = method.lower()
        client_method = getattr(client, method_name, client.get)

        if json_payload is not None:
            if hasattr(client, 'post') and hasattr(client, 'credentials'):  # DRF APIClient
                resp = client_method(rel_path, data=json_payload, format='json', **extra)
            else:
                body = json.dumps(json_payload)
                resp = client_method(rel_path, data=body, content_type='application/json', **extra)
        elif data is not None:
            resp = client_method(rel_path, data=data, **extra)
        else:
            resp = client_method(rel_path, **extra)

        # Parse DRF / Django response
        status_code = resp.status_code
        content = getattr(resp, 'content', b'')
        text = content.decode('utf-8', errors='replace') if isinstance(content, bytes) else str(content)

        if hasattr(resp, 'data'):
            resp_data = resp.data
        else:
            try:
                resp_data = json.loads(text) if text else None
            except Exception:
                resp_data = None

        resp_headers = dict(getattr(resp, 'headers', {}))
        return VMLResponse(
            status_code=status_code,
            data=resp_data,
            text=text,
            content=content,
            headers=resp_headers
        )

    # --- Standard REST Verbs ---
    def get(self, endpoint: str, params=None, headers=None) -> VMLResponse:
        return self._make_request('GET', endpoint, params=params, headers=headers)

    def post(self, endpoint: str, data=None, json=None, headers=None) -> VMLResponse:
        return self._make_request('POST', endpoint, data=data, json_payload=json, headers=headers)

    def put(self, endpoint: str, data=None, json=None, headers=None) -> VMLResponse:
        return self._make_request('PUT', endpoint, data=data, json_payload=json, headers=headers)

    def patch(self, endpoint: str, data=None, json=None, headers=None) -> VMLResponse:
        return self._make_request('PATCH', endpoint, data=data, json_payload=json, headers=headers)

    def delete(self, endpoint: str, headers=None) -> VMLResponse:
        return self._make_request('DELETE', endpoint, headers=headers)

    # --- Assertion Helpers ---
    def assert_status_code(self, response: VMLResponse, expected_status_code: int, msg: str = None):
        """
        Asserts that response status code matches expected status code.
        Provides detailed failure message if mismatch occurs.
        """
        if response.status_code != expected_status_code:
            detail_msg = (
                f"\n[Status Code Mismatch]"
                f"\n  Expected: {expected_status_code}"
                f"\n  Actual:   {response.status_code}"
                f"\n  Body:     {response.text[:500]}"
            )
            if msg:
                detail_msg = f"{msg}\n{detail_msg}"
            self.assertEqual(response.status_code, expected_status_code, detail_msg)

    def assert_json_structure(self, response_or_data, expected_keys: list, msg: str = None):
        """
        Asserts that the response or dictionary contains all required keys.
        """
        data = response_or_data.json() if isinstance(response_or_data, VMLResponse) else response_or_data
        self.assertIsInstance(data, (dict, list), f"Response data is not a JSON dict or list: {type(data)}")

        if isinstance(data, dict):
            missing_keys = [k for k in expected_keys if k not in data]
            if missing_keys:
                err = f"JSON missing required keys: {missing_keys}. Available keys: {list(data.keys())}"
                if msg:
                    err = f"{msg} -> {err}"
                self.fail(err)
        elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
            missing_keys = [k for k in expected_keys if k not in data[0]]
            if missing_keys:
                err = f"JSON list item missing required keys: {missing_keys}. Available keys: {list(data[0].keys())}"
                if msg:
                    err = f"{msg} -> {err}"
                self.fail(err)

    def assert_error_code(self, response: VMLResponse, expected_status_code: int = 400, expected_error_substring: str = None, msg: str = None):
        """
        Asserts error response status code and optional error substring in response body.
        """
        self.assert_status_code(response, expected_status_code, msg)
        if expected_error_substring:
            body_text = response.text
            self.assertIn(
                expected_error_substring,
                body_text,
                f"Expected error substring '{expected_error_substring}' not found in response body: {body_text[:300]}"
            )
