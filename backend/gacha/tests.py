from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from teams.models import Team, Player
from gacha.models import Pack, PackPlayer, PackOpeningSession
from gacha.services import open_pack, pick_card, expire_session


class PackSystemTestCase(TestCase):
    def setUp(self):
        self.team = Team.objects.create(name="Milan", budget=Decimal('1000.00'), gems=500)
        self.pack = Pack.objects.create(
            name="Milan Legends Pack",
            tier="LEGENDARY",
            cost_gems=100,
            cost_usd=Decimal('50.00'),
            purchase_method="BOTH",
            is_active=True
        )

        # Create 5 players in the pool
        self.players = []
        for i in range(5):
            p = PackPlayer.objects.create(
                pack=self.pack,
                name=f"Legendary Player {i + 1}",
                position="CF" if i % 2 == 0 else "CB",
                overall=85 + i,
                potential_ovr=95,
                age=24,
                base_stamina=90,
                rarity="LEGENDARY",
                wage=Decimal('500.00'),
                market_value=Decimal('25000000.00')
            )
            self.players.append(p)

    def test_open_pack_gems(self):
        res = open_pack(self.team.id, self.pack.id, payment_method='GEMS')
        self.assertTrue(res['success'], res)
        self.team.refresh_from_db()
        self.assertEqual(self.team.gems, 400)
        self.assertEqual(len(res['cards']), 3)
        self.assertEqual(PackOpeningSession.objects.count(), 1)
        session = PackOpeningSession.objects.first()
        self.assertEqual(session.status, 'PENDING')

    def test_open_and_pick_card_success(self):
        open_res = open_pack(self.team.id, self.pack.id, payment_method='GEMS')
        self.assertTrue(open_res['success'])
        session_id = open_res['session_id']
        selected_card_id = open_res['cards'][0]['id']

        pick_res = pick_card(session_id=session_id, pack_player_id=selected_card_id, team_id=self.team.id)
        self.assertTrue(pick_res['success'], pick_res)

        # Verify real player created in team
        self.team.refresh_from_db()
        self.assertEqual(self.team.players.count(), 1)
        created_p = self.team.players.first()
        self.assertEqual(created_p.name, open_res['cards'][0]['name'])

        # Verify picked PackPlayer marked claimed
        picked_pack_p = PackPlayer.objects.get(id=selected_card_id)
        self.assertTrue(picked_pack_p.is_claimed)
        self.assertEqual(picked_pack_p.claimed_by_team, self.team)

        # Verify other 4 players remain unclaimed in pool
        unclaimed_count = self.pack.players.filter(is_claimed=False).count()
        self.assertEqual(unclaimed_count, 4)

        # Verify session is completed
        session = PackOpeningSession.objects.get(id=session_id)
        self.assertEqual(session.status, 'COMPLETED')
        self.assertEqual(session.picked_card_id, selected_card_id)

    def test_pool_sold_out(self):
        # Claim 3 players so only 2 remain (< 3)
        for p in self.players[:3]:
            p.is_claimed = True
            p.save()

        res = open_pack(self.team.id, self.pack.id, payment_method='GEMS')
        self.assertFalse(res['success'])
        self.assertIn('تمام شده', res['error'])

    def test_session_expiry_and_refund(self):
        open_res = open_pack(self.team.id, self.pack.id, payment_method='GEMS')
        self.assertTrue(open_res['success'])
        session_id = open_res['session_id']

        session = PackOpeningSession.objects.get(id=session_id)
        # Fast-forward expiry
        session.expires_at = timezone.now() - timedelta(minutes=1)
        session.save()

        pick_res = pick_card(session_id=session_id, pack_player_id=open_res['cards'][0]['id'], team_id=self.team.id)
        self.assertFalse(pick_res['success'])
        self.assertIn('منقضی', pick_res['error'])

        # Verify refund occurred
        self.team.refresh_from_db()
        self.assertEqual(self.team.gems, 500)
        session.refresh_from_db()
        self.assertEqual(session.status, 'EXPIRED')
