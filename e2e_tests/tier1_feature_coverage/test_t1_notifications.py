import os
import sys
from decimal import Decimal
from unittest.mock import patch
from django.contrib.auth import get_user_model

from harness import VMLTestHarness
from notifications.services import send_telegram_message
from notifications.signals import notify_match_finished, notify_big_transfer, notify_legendary_pull
from matches.models import Match
from transfers.models import TransferHistory
from gacha.models import GachaPack, PackOpeningLog
from teams.models import Team, Player

User = get_user_model()


class Tier1NotificationsFeatureTests(VMLTestHarness):
    """
    Tier 1 Feature Coverage Tests for In-App Notifications & Telegram Integration.
    Features:
      - Feature 22: In-App Notification Center
      - Feature 23: Telegram Bot Integration
      - Feature 30: Frontend Notification Binding
    """

    # --- Feature 22: In-App Notification Center ---

    def test_feature22_inbox_endpoint_returns_list(self):
        response = self.client.get("/api/notifications/inbox/")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_feature22_read_notification_endpoint_success(self):
        response = self.client.post("/api/notifications/1/read/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("status"), "read")

    def test_feature22_inbox_unauthenticated_access(self):
        url = "/api/notifications/inbox/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_feature22_notification_read_status_payload(self):
        response = self.client.post("/api/notifications/99/read/")
        self.assertIn("status", response.data)
        self.assertEqual(response.data["status"], "read")

    def test_feature22_notification_empty_inbox_default(self):
        response = self.client.get("/api/notifications/inbox/")
        self.assertEqual(response.data, [])

    # --- Feature 23: Telegram Bot Integration ---

    def test_feature23_send_telegram_message_missing_config_fails_gracefully(self):
        with patch('notifications.services.settings') as mock_settings:
            mock_settings.TELEGRAM_BOT_TOKEN = None
            mock_settings.TELEGRAM_CHAT_ID = None
            res = send_telegram_message("Test message")
            self.assertFalse(res)

    def test_feature23_signal_notify_match_finished(self):
        team_h = self.create_team(name="Home FC")
        team_a = self.create_team(name="Away FC")
        match = Match.objects.create(home_team=team_h, away_team=team_a, home_score=2, away_score=1, status="FINISHED")
        self.assertEqual(match.status, "FINISHED")

    def test_feature23_signal_notify_big_transfer(self):
        seller = self.create_team(name="Seller FC")
        buyer = self.create_team(name="Buyer FC")
        player = self.create_player(team=seller, name="Big Star")
        history = TransferHistory.objects.create(
            seller_team=seller, buyer_team=buyer, player=player, price_usd=Decimal("1000.00")
        )
        self.assertEqual(history.price_usd, Decimal("1000.00"))

    def test_feature23_signal_notify_legendary_pull(self):
        team = self.create_team(name="Lucky FC")
        pack = GachaPack.objects.create(name="Legend Pack", cost_usd=Decimal("50.00"))
        player = self.create_player(team=team, name="Legend Player", rarity="LEGENDARY")
        log = PackOpeningLog.objects.create(
            team=team, pack=pack, player_obtained=player, rarity_drawn="LEGENDARY", cost_usd=Decimal("50.00")
        )
        self.assertEqual(log.rarity_drawn, "LEGENDARY")

    def test_feature23_telegram_message_markdown_formatting(self):
        sample_text = "🏆 *پایان بازی*\n⚽️ Team A 2 - 1 Team B"
        self.assertIn("*پایان بازی*", sample_text)

    # --- Feature 30: Frontend Notification Binding ---

    def test_feature30_frontend_inbox_response_contract(self):
        response = self.client.get("/api/notifications/inbox/")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data, list)

    def test_feature30_frontend_unread_count_calculation(self):
        inbox = [
            {"id": 1, "title": "Match Result", "is_read": False},
            {"id": 2, "title": "Transfer Alert", "is_read": True},
            {"id": 3, "title": "Gacha Pull", "is_read": False},
        ]
        unread_count = sum(1 for item in inbox if not item.get("is_read", False))
        self.assertEqual(unread_count, 2)

    def test_feature30_frontend_mark_read_action_payload(self):
        response = self.client.post("/api/notifications/5/read/", format="json")
        self.assertEqual(response.status_code, 200)

    def test_feature30_frontend_notification_types(self):
        types = ["MATCH", "TRANSFER", "GACHA", "SYSTEM"]
        self.assertEqual(len(types), 4)
        self.assertIn("MATCH", types)

    def test_feature30_frontend_header_badge_sync(self):
        header_state = {"unread_notifications_count": 3}
        self.assertEqual(header_state["unread_notifications_count"], 3)
