"""
Self-tests for VMLTestHarness core functionality.
Categorized as Harness Verification Tests.
"""

from e2e_tests.test_harness import VMLTestHarness, VMLResponse


class HarnessSelfTest(VMLTestHarness):
    """
    Test suite to verify that the VMLTestHarness functions correctly.
    """

    def test_harness_initialization(self):
        """Verify harness initialized base URL and execution mode."""
        self.assertIsNotNone(self.base_url)
        self.assertTrue(self.base_url.startswith("http"))
        self.assertIsInstance(self.use_live_server, bool)

    def test_token_manager(self):
        """Verify auth token management methods."""
        self.assertIsNone(self.token)
        self.assertEqual(self.get_auth_headers(), {})

        sample_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token"
        self.set_token(sample_token)
        self.assertEqual(self.token, sample_token)
        self.assertEqual(self.get_auth_headers(), {"Authorization": f"Bearer {sample_token}"})

        self.clear_token()
        self.assertIsNone(self.token)
        self.assertEqual(self.get_auth_headers(), {})

    def test_endpoint_normalization(self):
        """Verify URL path normalization for both relative and absolute endpoints."""
        rel1, full1 = self._normalize_endpoint("/users/me/")
        self.assertEqual(rel1, "/api/users/me/")
        self.assertTrue(full1.endswith("/api/users/me/"))

        rel2, full2 = self._normalize_endpoint("api/teams/my-team/")
        self.assertEqual(rel2, "/api/teams/my-team/")
        self.assertTrue(full2.endswith("/api/teams/my-team/"))

        rel3, full3 = self._normalize_endpoint("http://127.0.0.1:9000/api/matches/schedule/")
        self.assertEqual(rel3, "/api/matches/schedule/")
        self.assertEqual(full3, "http://127.0.0.1:9000/api/matches/schedule/")

    def test_assertion_helpers(self):
        """Verify custom assertion helper methods."""
        dummy_resp = VMLResponse(
            status_code=200,
            data={"status": "success", "user": {"id": 1, "name": "Manager"}},
            text='{"status": "success", "user": {"id": 1, "name": "Manager"}}'
        )

        self.assert_status_code(dummy_resp, 200)
        self.assert_json_structure(dummy_resp, ["status", "user"])
        self.assert_json_structure(dummy_resp.json()["user"], ["id", "name"])

        err_resp = VMLResponse(
            status_code=400,
            data={"detail": "موجودی کافی نیست."},
            text='{"detail": "موجودی کافی نیست."}'
        )

        self.assert_error_code(err_resp, 400, "موجودی کافی نیست.")

    def test_live_stream_endpoint_dispatch(self):
        """Test API request dispatching to live_stream REST endpoint."""
        resp = self.get("/teams/live_stream/")
        self.assertIn(resp.status_code, [200, 404])
        if resp.status_code == 200:
            self.assertIsInstance(resp.json(), dict)
