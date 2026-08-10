"""
Main E2E Test Suite Runner for Virtual Master League (VML).

Discovers and executes test suites across Tier 1, Tier 2, Tier 3, and Tier 4.
Prints a structured summary report showing total tests run, passed, failed,
errored, skipped, and tier breakdown. Exits with code 0 on success.
"""

import os
import sys
import time
import unittest

# Ensure project root and backend are in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
backend_dir = os.path.join(project_root, "backend")
venv_site = os.path.join(backend_dir, "venv", "Lib", "site-packages")

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='backslashreplace')
    except Exception:
        pass

if os.path.exists(venv_site) and venv_site not in sys.path:
    sys.path.insert(0, venv_site)
if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def safe_print(text):
    try:
        print(text)
    except Exception:
        try:
            sys.stdout.buffer.write(str(text).encode('utf-8', errors='replace') + b'\n')
        except Exception:
            pass



def categorize_test(test_case):
    """
    Categorizes a test case into Tier 1, Tier 2, Tier 3, Tier 4, or Harness.
    """
    mod_name = test_case.__class__.__module__.lower()
    cls_name = test_case.__class__.__name__.lower()
    test_id = test_case.id().lower()

    full_identifier = f"{mod_name}.{cls_name}.{test_id}"

    if "tier1" in full_identifier or "auth" in full_identifier or "profile" in full_identifier:
        return "Tier 1: Auth & User Profile"
    elif "tier2" in full_identifier or "team" in full_identifier or "gameplan" in full_identifier or "facility" in full_identifier:
        return "Tier 2: Team & GamePlan"
    elif "tier3" in full_identifier or "match" in full_identifier or "standing" in full_identifier or "substitute" in full_identifier:
        return "Tier 3: Matches & Standings"
    elif "tier4" in full_identifier or "transfer" in full_identifier or "economy" in full_identifier or "gacha" in full_identifier or "zarinpal" in full_identifier:
        return "Tier 4: Transfers & Economy"
    else:
        return "Harness Self-Test / General"


class TierTestResult(unittest.TestResult):
    """
    Custom TestResult tracking per-tier statistics and overall execution details.
    """

    def __init__(self, stream=None, descriptions=None, verbosity=1):
        super().__init__(stream, descriptions, verbosity)
        self.tier_stats = {
            "Tier 1: Auth & User Profile": {"run": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
            "Tier 2: Team & GamePlan": {"run": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
            "Tier 3: Matches & Standings": {"run": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
            "Tier 4: Transfers & Economy": {"run": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
            "Harness Self-Test / General": {"run": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0},
        }

    def startTest(self, test):
        super().startTest(test)
        tier = categorize_test(test)
        if tier not in self.tier_stats:
            self.tier_stats[tier] = {"run": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0}
        self.tier_stats[tier]["run"] += 1

    def addSuccess(self, test):
        super().addSuccess(test)
        tier = categorize_test(test)
        self.tier_stats[tier]["passed"] += 1

    def addFailure(self, test, err):
        super().addFailure(test, err)
        tier = categorize_test(test)
        self.tier_stats[tier]["failed"] += 1

    def addError(self, test, err):
        super().addError(test, err)
        tier = categorize_test(test)
        self.tier_stats[tier]["errors"] += 1

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        tier = categorize_test(test)
        self.tier_stats[tier]["skipped"] += 1


def run_all_tests():
    start_time = time.time()

    # Discover tests in e2e_tests directory
    e2e_dir = os.path.dirname(os.path.abspath(__file__))
    loader = unittest.TestLoader()

    suite = loader.discover(start_dir=e2e_dir, pattern="test_*.py")

    result = TierTestResult()
    suite.run(result)

    elapsed_time = time.time() - start_time

    from e2e_tests.test_harness import VMLTestHarness
    mode_str = "Live HTTP Server (http://127.0.0.1:9000/api)" if getattr(VMLTestHarness, 'use_live_server', False) else "In-Memory Django REST APIClient Fallback Engine"

    print("\n" + "=" * 78)
    print(" VIRTUAL MASTER LEAGUE (VML) - END-TO-END TEST SUITE SUMMARY REPORT")
    print("=" * 78)
    print(f" Execution Mode: {mode_str}")
    print(f" Target API URL: {VMLTestHarness.base_url}")
    print("-" * 78)
    print(f" {'Tier Category':<35} | {'Run':<5} | {'Pass':<5} | {'Fail':<5} | {'Err':<5} | {'Pass Rate':<8}")
    print("-" * 78)

    total_run = 0
    total_passed = 0
    total_failed = 0
    total_errors = 0
    total_skipped = 0

    for tier_name, stats in result.tier_stats.items():
        run_count = stats["run"]
        passed_count = stats["passed"]
        failed_count = stats["failed"]
        err_count = stats["errors"]
        skip_count = stats["skipped"]

        total_run += run_count
        total_passed += passed_count
        total_failed += failed_count
        total_errors += err_count
        total_skipped += skip_count

        if run_count > 0:
            pass_rate = (passed_count / run_count) * 100
            rate_str = f"{pass_rate:6.1f}%"
        else:
            rate_str = " N/A"

        print(f" {tier_name:<35} | {run_count:<5} | {passed_count:<5} | {failed_count:<5} | {err_count:<5} | {rate_str:<8}")

    print("-" * 78)
    overall_rate = (total_passed / total_run * 100) if total_run > 0 else 0.0
    print(f" TOTAL TESTS RUN:  {total_run}")
    print(f" TOTAL PASSED:     {total_passed}")
    print(f" TOTAL FAILED:     {total_failed}")
    print(f" TOTAL ERRORED:    {total_errors}")
    print(f" TOTAL SKIPPED:    {total_skipped}")
    print(f" OVERALL SUCCESS:  {overall_rate:.1f}%")
    print(f" ELAPSED TIME:     {elapsed_time:.2f}s")
    print("=" * 78)

    if result.failures:
        safe_print("\n--- FAILURE DETAILS ---")
        for test, err in result.failures:
            safe_print(f"\nFAIL: {test.id()}")
            safe_print(err)

    if result.errors:
        safe_print("\n--- ERROR DETAILS ---")
        for test, err in result.errors:
            safe_print(f"\nERROR: {test.id()}")
            safe_print(err)

    is_success = (total_failed == 0 and total_errors == 0)
    sys.exit(0 if is_success else 1)


if __name__ == "__main__":
    run_all_tests()
