import os
import sys

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from e2e_tests.test_harness import VMLTestHarness, _setup_django_environment

_setup_django_environment()
