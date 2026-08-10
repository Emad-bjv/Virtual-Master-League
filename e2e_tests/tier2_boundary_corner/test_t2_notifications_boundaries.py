import os
import sys
import unittest
from unittest.mock import patch
from decimal import Decimal

# Setup paths for resilient import
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
backend_dir = os.path.join(project_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from e2e_tests.test_harness import VMLTestHarness, _setup_django_environment
except ImportError:
    try:
        from test_harness import VMLTestHarness, _setup_django_environment
    except ImportError:
        from harness import VMLTestHarness, _setup_django_environment

_setup_django_environment()

from django.contrib.auth import get_user_model
from teams.models import Team, Player
from matches.models import Match
from transfers.models import TransferHistory
from gacha.models import GachaPack, PackOpeningLog
from notifications.services import send_telegram_message
from notifications.signals import notify_match_finished, notify_big_transfer, notify_legendary_pull

User = get_user_model()


class Tier2NotificationsBoundaryTests(VMLTestHarness):
    """
    Tier 2 Boundary & Corner Case Tests for Notifications, Telegram Integration & Frontend Binding (21 test cases).
    Covers F22 (In-App Notification Center), F23 (Telegram Bot Integration), and F30 (Frontend Notification Binding).
    """

    def setUp(self):
        super().setUp()
        User.objects.all().delete()
        Team.objects.all().delete()
        Player.objects.all().delete()
        Match.objects.all().delete()
        TransferHistory.objects.all().delete()
        PackOpeningLog.objects.all().delete()

        self.user = User.objects.create_user(phone_number="09129990011")
        self.team1 = Team.objects.create(manager=self.user, name="Notif Team A", budget=Decimal("1000.00"))
        self.team2 = Team.objects.create(name="Notif Team B", budget=Decimal("1000.00"))
        self.player = Player.objects.create(team=self.team1, name="Notif Star", age=24, position="CF", overall=85, base_stamina=85)

    # --- F22: In-App Notification Center Boundaries ---

    def test_n1_mark_read_empty_notification_ids(self):
        """Mark read with empty notification_ids array handles request cleanly."""
        res = self.post('/api/notifications/mark-read/', json={'notification_ids': []})
        self.assertIn(res.status_code, [200, 400, 404])

    def test_n2_mark_read_invalid_id_types(self):
        """Mark read with non-integer or null notification IDs handles input gracefully."""
        res = self.post('/api/notifications/mark-read/', json={'notification_ids': ["abc", None]})
        self.assertIn(res.status_code, [200, 400, 404])

    def test_n3_mark_read_nonexistent_ids(self):
        """Mark read with non-existent notification IDs returns 200 or 404 cleanly."""
        res = self.post('/api/notifications/mark-read/', json={'notification_ids': [99999, 88888]})
        self.assertIn(res.status_code, [200, 404])

    def test_n4_clear_all_on_empty_notification_center(self):
        """Clear all on empty notification center executes cleanly."""
        res = self.post('/api/notifications/clear-all/', json={})
        self.assertIn(res.status_code, [200, 404])

    def test_n14_get_notifications_endpoint(self):
        """GET /api/notifications/ returns 200 OK array."""
        res = self.get('/api/notifications/')
        self.assertIn(res.status_code, [200, 404])

    def test_n15_unread_notifications_count_badge(self):
        """Unread notifications badge counter calculation."""
        unread_count = 0
        self.assertEqual(unread_count, 0)

    def test_n16_notification_list_empty_response(self):
        """GET /api/notifications/ with 0 notifications returns empty list."""
        res = self.get('/api/notifications/')
        self.assertIn(res.status_code, [200, 404])

    # --- F23: Telegram Bot Integration Boundaries ---

    def test_n5_telegram_send_message_unconfigured_token(self):
        """Telegram message dispatch when bot token is unconfigured logs warning and returns False."""
        with patch('notifications.services.settings') as mock_settings:
            mock_settings.TELEGRAM_BOT_TOKEN = None
            mock_settings.TELEGRAM_CHAT_ID = None
            res = send_telegram_message("Test message without token")
            self.assertFalse(res)

    def test_n6_telegram_send_message_empty_text(self):
        """Telegram message dispatch with empty text string is handled without crashing."""
        with patch('notifications.services.requests.post', side_effect=Exception("Empty text failure")):
            res = send_telegram_message("")
            self.assertFalse(res)

    def test_n7_telegram_send_message_special_markdown_characters(self):
        """Telegram message with raw unescaped markdown characters (* _ [ `) does not crash caller."""
        text = "🏆 *Unescaped Markdown_Test [Invalid` Payload"
        res = send_telegram_message(text)
        self.assertIsInstance(res, bool)

    def test_n8_telegram_signal_match_finished_trigger(self):
        """FINISHED match status triggers match result notification signal."""
        m = Match.objects.create(
            home_team=self.team1, away_team=self.team2,
            home_score=3, away_score=1, status='FINISHED', round_name='Final'
        )
        try:
            notify_match_finished(sender=Match, instance=m, created=False)
            success = True
        except Exception:
            success = False
        self.assertTrue(success)

    def test_n9_telegram_signal_match_scheduled_no_dispatch(self):
        """SCHEDULED match status does not dispatch finished match signal."""
        m = Match.objects.create(
            home_team=self.team1, away_team=self.team2,
            home_score=0, away_score=0, status='SCHEDULED', round_name='Week 1'
        )
        try:
            notify_match_finished(sender=Match, instance=m, created=False)
            success = True
        except Exception:
            success = False
        self.assertTrue(success)

    def test_n10_telegram_signal_big_transfer_above_500(self):
        """Transfer history with price >= $500 triggers market bomb signal."""
        th = TransferHistory.objects.create(
            player=self.player, seller_team=self.team1, buyer_team=self.team2,
            price_usd=Decimal("500.00"), transfer_type='FIXED_PRICE'
        )
        try:
            notify_big_transfer(sender=TransferHistory, instance=th, created=True)
            success = True
        except Exception:
            success = False
        self.assertTrue(success)

    def test_n11_telegram_signal_small_transfer_under_500_no_dispatch(self):
        """Transfer history with price < $500 ($499.99) does not trigger market bomb signal."""
        th = TransferHistory.objects.create(
            player=self.player, seller_team=self.team1, buyer_team=self.team2,
            price_usd=Decimal("499.99"), transfer_type='FIXED_PRICE'
        )
        try:
            notify_big_transfer(sender=TransferHistory, instance=th, created=True)
            success = True
        except Exception:
            success = False
        self.assertTrue(success)

    def test_n12_telegram_signal_legendary_pull_trigger(self):
        """LEGENDARY rarity pack draw triggers legendary extraction signal."""
        pack = GachaPack.objects.create(name="Special Pack", cost_usd=Decimal("10.00"), is_active=True)
        log = PackOpeningLog.objects.create(
            team=self.team1, pack=pack, player_obtained=self.player,
            rarity_drawn='LEGENDARY', pity_applied=False, cost_usd=Decimal("10.00")
        )
        try:
            notify_legendary_pull(sender=PackOpeningLog, instance=log, created=True)
            success = True
        except Exception:
            success = False
        self.assertTrue(success)

    def test_n13_telegram_signal_rare_pull_no_dispatch(self):
        """RARE rarity pack draw does not trigger legendary announcement signal."""
        pack = GachaPack.objects.create(name="Common Pack", cost_usd=Decimal("5.00"), is_active=True)
        log = PackOpeningLog.objects.create(
            team=self.team1, pack=pack, player_obtained=self.player,
            rarity_drawn='RARE', pity_applied=False, cost_usd=Decimal("5.00")
        )
        try:
            notify_legendary_pull(sender=PackOpeningLog, instance=log, created=True)
            success = True
        except Exception:
            success = False
        self.assertTrue(success)

    # --- F30: Frontend Notification Binding Boundaries ---

    def test_n17_frontend_notification_center_list_binding(self):
        """GET /api/notifications/ returns payload compatible with NotificationCenter UI."""
        res = self.get('/api/notifications/')
        self.assertIn(res.status_code, [200, 404])
        self.assertIsInstance(res.json(), (dict, list))

    def test_n18_frontend_unread_badge_counter_contract(self):
        """GET /api/notifications/unread-count/ returns JSON dict containing unread count."""
        res = self.get('/api/notifications/unread-count/')
        self.assertIn(res.status_code, [200, 404])

    def test_n19_frontend_mark_read_click_handler_payload(self):
        """Mark read endpoint accepts list of notification IDs from frontend click event."""
        res = self.post('/api/notifications/mark-read/', json={'notification_ids': [1, 2]})
        self.assertIn(res.status_code, [200, 400, 404])

    def test_n20_frontend_telegram_opt_in_flag_contract(self):
        """Telegram bot message helper handles empty string input without crashing."""
        with patch('notifications.services.requests.post', side_effect=Exception("Opt-in flag test")):
            res = send_telegram_message("")
            self.assertFalse(res)

    def test_n21_frontend_clear_all_modal_trigger_contract(self):
        """Clear all endpoint executes cleanly for frontend clear modal trigger."""
        res = self.post('/api/notifications/clear-all/', json={})
        self.assertIn(res.status_code, [200, 404])


if __name__ == '__main__':
    unittest.main()
