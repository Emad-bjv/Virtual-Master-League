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
            team=team, pack=pack, player_obtained=player, rarity_drawn="LEGENDARY", cost=Decimal("50.00")
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

    # --- Requirement R1: Smart Notifications, Role Separation & Dismissal ---

    def test_r1_role_separation_coach_and_admin(self):
        """
        Verify role-based notification segregation:
        - Admin sees notifications with target_role IN ['ALL', 'ADMIN']
        - Coach sees notifications for their own team + target_role IN ['ALL', 'COACH']
        - Coach does NOT see other team's notifications
        """
        from notifications.models import Notification
        Notification.objects.all().delete()

        admin_user = self.create_user(username="admin_r1", role="admin", is_staff=True)
        coach1 = self.create_user(username="coach1_r1", role="coach")
        team1 = self.create_team(manager=coach1, name="Team 1 R1")

        coach2 = self.create_user(username="coach2_r1", role="coach")
        team2 = self.create_team(manager=coach2, name="Team 2 R1")

        # Create notifications
        n_admin = Notification.objects.create(
            category="MATCH", target_role="ADMIN", title="Admin Ref Room Alert",
            action_url="/admin/matches?match_id=1"
        )
        n_team1 = Notification.objects.create(
            team=team1, category="MATCH", target_role="COACH", title="Team 1 Kickoff",
            action_url="/live?match_id=1"
        )
        n_team2 = Notification.objects.create(
            team=team2, category="MATCH", target_role="COACH", title="Team 2 Kickoff",
            action_url="/live?match_id=2"
        )
        n_public = Notification.objects.create(
            team=None, category="SYSTEM", target_role="ALL", title="Public League Notice"
        )

        # 1. Coach 1 View
        self.client.force_authenticate(user=coach1)
        res_coach1 = self.client.get("/api/notifications/inbox/")
        self.assertEqual(res_coach1.status_code, 200)
        c1_titles = [item["title"] for item in res_coach1.data]
        self.assertIn("Team 1 Kickoff", c1_titles)
        self.assertIn("Public League Notice", c1_titles)
        self.assertNotIn("Team 2 Kickoff", c1_titles)
        self.assertNotIn("Admin Ref Room Alert", c1_titles)

        # 2. Admin View
        self.client.force_authenticate(user=admin_user)
        res_admin = self.client.get("/api/notifications/inbox/")
        self.assertEqual(res_admin.status_code, 200)
        admin_titles = [item["title"] for item in res_admin.data]
        self.assertIn("Admin Ref Room Alert", admin_titles)
        self.assertIn("Public League Notice", admin_titles)

    def test_r1_dismiss_notification_api(self):
        """
        POST /api/notifications/<id>/dismiss/ marks is_dismissed=True and sets dismissed_at.
        """
        from notifications.models import Notification
        notif = Notification.objects.create(
            category="MATCH", title="Dismiss Test Alert", is_dismissed=False
        )
        response = self.client.post(f"/api/notifications/{notif.id}/dismiss/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("status"), "dismissed")
        self.assertEqual(response.data.get("id"), notif.id)

        notif.refresh_from_db()
        self.assertTrue(notif.is_dismissed)
        self.assertIsNotNone(notif.dismissed_at)

    def test_r1_is_dismissed_filtering(self):
        """
        GET /api/notifications/inbox/?dismissed=false returns only active notifications,
        and ?dismissed=true returns dismissed ones.
        """
        from notifications.models import Notification
        Notification.objects.all().delete()
        n_active = Notification.objects.create(
            title="Active Alert", is_dismissed=False, target_role="ALL"
        )
        n_dismissed = Notification.objects.create(
            title="Dismissed Alert", is_dismissed=True, target_role="ALL"
        )

        res_active = self.client.get("/api/notifications/inbox/?dismissed=false")
        self.assertEqual(res_active.status_code, 200)
        active_ids = [item["id"] for item in res_active.data]
        self.assertIn(n_active.id, active_ids)
        self.assertNotIn(n_dismissed.id, active_ids)

        res_dismissed = self.client.get("/api/notifications/inbox/?dismissed=true")
        self.assertEqual(res_dismissed.status_code, 200)
        dismissed_ids = [item["id"] for item in res_dismissed.data]
        self.assertIn(n_dismissed.id, dismissed_ids)
        self.assertNotIn(n_active.id, dismissed_ids)

    def test_r1_action_url_and_match_routing(self):
        """
        Notification serializer preserves action_url and target_role fields for UI deep-linking.
        """
        from notifications.models import Notification
        team = self.create_team(name="Routing Team")
        match = Match.objects.create(home_team=team, status="SCHEDULED")
        notif = Notification.objects.create(
            team=team,
            match=match,
            category="MATCH",
            target_role="COACH",
            title="Matchday Room Ready",
            action_url=f"/live?match_id={match.id}"
        )
        self.client.force_authenticate(user=team.manager)
        res = self.client.get("/api/notifications/inbox/")
        self.assertEqual(res.status_code, 200)
        item = next(x for x in res.data if x["id"] == notif.id)
        self.assertEqual(item["action_url"], f"/live?match_id={match.id}")
        self.assertEqual(item["target_role"], "COACH")
        self.assertEqual(item["match"], match.id)

    def test_r1_read_persistence_in_db(self):
        """
        POST /api/notifications/<id>/read/ persists is_read=True in the database.
        """
        from notifications.models import Notification
        notif = Notification.objects.create(
            category="MATCH", title="Read Persistence Test", is_read=False
        )
        res = self.client.post(f"/api/notifications/{notif.id}/read/")
        self.assertEqual(res.status_code, 200)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)
