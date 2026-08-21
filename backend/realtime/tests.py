from unittest.mock import patch
from django.test import TestCase
from realtime.events import notify_admin, broadcast_match_event
from realtime.models import AdminNotification


class RealtimeBroadcastingTestCase(TestCase):
    def test_notify_admin_success(self):
        with patch('realtime.events.get_channel_layer') as mock_get_layer:
            mock_layer = mock_get_layer.return_value
            notify_admin({'text': 'Test notification'})
            self.assertEqual(AdminNotification.objects.count(), 1)

    def test_notify_admin_fault_tolerance_on_redis_error(self):
        with patch('realtime.events.get_channel_layer', side_effect=Exception('Redis connection refused')):
            # Should not raise exception
            try:
                notify_admin({'text': 'Test failure'})
            except Exception as e:
                self.fail(f"notify_admin raised exception when Redis was down: {e}")

    def test_broadcast_match_event_fault_tolerance_on_redis_error(self):
        with patch('realtime.events.get_channel_layer', side_effect=Exception('Redis timeout')):
            # Should not raise exception
            try:
                broadcast_match_event(999, {'type': 'goal'})
            except Exception as e:
                self.fail(f"broadcast_match_event raised exception when Redis was down: {e}")

