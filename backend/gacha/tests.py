from decimal import Decimal
from django.test import TestCase
from teams.models import Team, Player
from gacha.models import GachaPack, GachaPity, PackOpeningLog
from gacha.services import open_gacha_pack


class GachaEngineTestCase(TestCase):
    def setUp(self):
        self.team = Team.objects.create(name="Barcelona", budget=Decimal('1000.00'))
        self.pack = GachaPack.objects.create(
            name="Gold Pack",
            cost_usd=Decimal('100.00'),
            rate_rare=Decimal('70.00'),
            rate_epic=Decimal('25.00'),
            rate_legendary=Decimal('5.00'),
            is_active=True
        )

    def test_open_pack_success(self):
        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertTrue(res['success'], res)
        self.team.refresh_from_db()
        self.assertEqual(self.team.budget, Decimal('900.00'))
        self.assertEqual(self.team.players.count(), 1)
        self.assertEqual(PackOpeningLog.objects.count(), 1)

    def test_insufficient_budget(self):
        self.team.budget = Decimal('50.00')
        self.team.save()

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertFalse(res['success'])
        self.assertIn('موجودی کافی نیست', res['error'])

    def test_pity_counter_trigger(self):
        pity = GachaPity.objects.create(team=self.team, counter_direct=7, counter_gems=12)

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertTrue(res['success'])
        self.assertTrue(res['pity_applied'])
        self.assertEqual(res['rarity'], 'LEGENDARY')

        pity.refresh_from_db()
        self.assertEqual(pity.counter_gems, 0)

    def test_max_roster_cap(self):
        # Create 25 players
        for i in range(25):
            Player.objects.create(
                team=self.team,
                name=f"Player {i}",
                age=20,
                position='CMF',
                overall=75,
                base_stamina=80
            )

        res = open_gacha_pack(self.team.id, self.pack.id)
        self.assertFalse(res['success'])
        self.assertIn('حداکثر ظرفیت مجاز', res['error'])
