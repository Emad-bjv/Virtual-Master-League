from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from teams.models import Team, Player
from gacha.models import Pack, PackPlayer, PackOpeningSession
from gacha.services import open_pack, pick_card, expire_session, weighted_sample_pack_cards


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

    def test_admin_return_claimed_player_to_pack(self):
        from rest_framework.test import APIClient
        from users.models import User

        admin_user = User.objects.create_superuser(username='admin_pack_test', email='admin@test.com', password='password123')
        client = APIClient()
        client.force_authenticate(user=admin_user)

        # 1. Open and pick a card so player is in team
        open_res = open_pack(self.team.id, self.pack.id, payment_method='GEMS')
        selected_card_id = open_res['cards'][0]['id']
        pick_res = pick_card(session_id=open_res['session_id'], pack_player_id=selected_card_id, team_id=self.team.id)
        self.assertTrue(pick_res['success'])

        self.assertEqual(self.team.players.count(), 1)
        pack_player = PackPlayer.objects.get(id=selected_card_id)
        self.assertTrue(pack_player.is_claimed)
        self.assertEqual(pack_player.claimed_by_team, self.team)

        # 2. Call admin return endpoint
        url = f"/api/gacha/admin/packs/{self.pack.id}/players/{pack_player.id}/return/"
        res = client.post(url)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data['success'])

        # 3. Verify player was deleted from team
        self.assertEqual(self.team.players.count(), 0)

        # 4. Verify pack_player is reset to unclaimed in pack pool
        pack_player.refresh_from_db()
        self.assertFalse(pack_player.is_claimed)
        self.assertIsNone(pack_player.claimed_by_team)
        self.assertIsNone(pack_player.claimed_at)

        # 5. Verify pack has all 5 players available again
        self.assertEqual(self.pack.players.filter(is_claimed=False).count(), 5)

    def test_weighted_sampling_and_guarantee_slot(self):
        # Add 95 and 91 players so eligible guaranteed candidates exist
        PackPlayer.objects.create(
            pack=self.pack, name="Top Star 95", position="CF", overall=95, potential_ovr=99, age=25
        )
        PackPlayer.objects.create(
            pack=self.pack, name="Star 91", position="AMF", overall=91, potential_ovr=95, age=26
        )

        # Verify odds breakdown method
        odds = self.pack.get_odds_breakdown()
        self.assertIn('top_tier_pct', odds)
        self.assertIn('mid_tier_pct', odds)
        self.assertIn('base_tier_pct', odds)
        self.assertEqual(odds['guarantee_min_ovr'], 90)

        # In multiple openings with guarantee_min_ovr=90, every opening must contain at least 1 card with OVR >= 90
        for _ in range(10):
            res = open_pack(self.team.id, self.pack.id, payment_method='GEMS')
            self.assertTrue(res['success'])
            card_ovrs = [c['overall'] for c in res['cards']]
            self.assertTrue(any(ovr >= 90 for ovr in card_ovrs), f"Expected at least one card >= 90 in {card_ovrs}")
            # Expire session so gems are refunded and cards remain available for next test iteration
            expire_session(res['session_id'])

    def test_early_bird_anti_snipe_boost(self):
        # Setup 95 overall player
        PackPlayer.objects.create(
            pack=self.pack, name="Cristiano Test", position="CF", overall=95, potential_ovr=99, age=28
        )
        self.pack.early_bird_boost_pct = 60
        self.pack.save()

        # At full pool (100% full)
        odds = self.pack.get_odds_breakdown()
        self.assertTrue(odds['is_early_bird_active'])
        self.assertEqual(odds['early_bird_multiplier'], 1.6)

        # Sample cards with full pool
        unclaimed = list(self.pack.players.filter(is_claimed=False))
        cards = weighted_sample_pack_cards(self.pack, unclaimed)
        self.assertEqual(len(cards), 3)

        # Mark 4 players claimed so pool drops below 70% fullness
        for p in unclaimed[:4]:
            p.is_claimed = True
            p.save()

        # Odds when depleted below 70%
        depleted_odds = self.pack.get_odds_breakdown()
        self.assertFalse(depleted_odds['is_early_bird_active'])
        self.assertLess(depleted_odds['early_bird_multiplier'], 1.6)

    def test_calculate_player_drop_probabilities_and_predictive_odds(self):
        p95 = PackPlayer.objects.create(
            pack=self.pack, name="Zidane 95", position="AMF", overall=95, potential_ovr=99, age=28
        )
        p91 = PackPlayer.objects.create(
            pack=self.pack, name="Modric 91", position="CMF", overall=91, potential_ovr=94, age=30
        )
        p80 = PackPlayer.objects.create(
            pack=self.pack, name="Regular 80", position="CB", overall=80, potential_ovr=85, age=22
        )

        odds_normal = self.pack.calculate_player_drop_probabilities(is_loyalty_boost=False)
        self.assertIn(p95.id, odds_normal)
        self.assertIn(p91.id, odds_normal)
        self.assertIn(p80.id, odds_normal)

        p95_odds = odds_normal[p95.id]
        p_odds = p95_odds['predictive_odds']
        self.assertGreater(p95_odds['drop_chance_pct'], 0)
        # Verify cumulative probability progression: P(1) <= P(3) <= P(5) <= P(10)
        self.assertLessEqual(p_odds['pack_1'], p_odds['pack_3'])
        self.assertLessEqual(p_odds['pack_3'], p_odds['pack_5'])
        self.assertLessEqual(p_odds['pack_5'], p_odds['pack_10'])

        # Compare with loyalty boost
        odds_boosted = self.pack.calculate_player_drop_probabilities(is_loyalty_boost=True)
        p95_boosted = odds_boosted[p95.id]
        self.assertGreater(p95_boosted['drop_chance_pct'], p95_odds['drop_chance_pct'])

    def test_loyalty_pity_system_activation_and_reset(self):
        from gacha.services import get_team_pack_loyalty_status

        top_player = PackPlayer.objects.create(
            pack=self.pack, name="Ronaldo 96", position="CF", overall=96, potential_ovr=99, age=27
        )

        status_init = get_team_pack_loyalty_status(self.team, self.pack)
        self.assertFalse(status_init['is_loyalty_boost_active'])
        self.assertEqual(status_init['consecutive_opens'], 0)
        self.assertEqual(status_init['opens_until_boost'], 3)

        # Give team ample gems for multiple openings
        self.team.gems = 2000
        self.team.save()

        # Simulate 3 pack openings where coach chooses low-tier players (overall < 94)
        for i in range(3):
            open_res = open_pack(self.team.id, self.pack.id, payment_method='GEMS')
            self.assertTrue(open_res['success'])
            # Pick a non-top card
            low_card = [c for c in open_res['cards'] if c['overall'] < 94][0]
            pick_res = pick_card(open_res['session_id'], low_card['id'], self.team.id)
            self.assertTrue(pick_res['success'])

        # Now coach has opened 3 consecutive packs without a 94+ card:
        # Pity is at step 3, meaning the 4th open is HARD GUARANTEED!
        status_boosted = get_team_pack_loyalty_status(self.team, self.pack)
        self.assertTrue(status_boosted['is_loyalty_boost_active'])
        self.assertTrue(status_boosted['is_hard_guaranteed'])
        self.assertEqual(status_boosted['consecutive_opens'], 3)
        self.assertEqual(status_boosted['opens_until_boost'], 0)
        # Check progressive multipliers: mid = 1.0 + 3 * 0.35 = 2.05, top = 1.0 + 3 * 0.15 = 1.45
        self.assertEqual(status_boosted['mid_multiplier'], 2.05)
        self.assertEqual(status_boosted['top_multiplier'], 1.45)

        # 4th opening: MUST have hard pity applied and guaranteed top card!
        open_boosted_res = open_pack(self.team.id, self.pack.id, payment_method='GEMS')
        self.assertTrue(open_boosted_res['success'])
        self.assertTrue(open_boosted_res['is_hard_pity_applied'])
        self.assertEqual(open_boosted_res['guaranteed_card_id'], top_player.id)
        # Verify exactly one card has is_pity_guaranteed = True
        guaranteed_in_cards = [c for c in open_boosted_res['cards'] if c.get('is_pity_guaranteed')]
        self.assertEqual(len(guaranteed_in_cards), 1)
        self.assertEqual(guaranteed_in_cards[0]['id'], top_player.id)

        # Coach picks top_player (OVR 96)
        pick_top_res = pick_card(open_boosted_res['session_id'], top_player.id, self.team.id)
        self.assertTrue(pick_top_res['success'])

        # Pity should now be RESET because top player was drawn
        status_after = get_team_pack_loyalty_status(self.team, self.pack)
        self.assertFalse(status_after['is_loyalty_boost_active'])
        self.assertFalse(status_after['is_hard_guaranteed'])
        self.assertEqual(status_after['consecutive_opens'], 0)
        self.assertEqual(status_after['opens_until_boost'], 3)

    def test_admin_patch_player_drop_weight(self):
        from rest_framework.test import APIClient
        from users.models import User

        admin_user = User.objects.create_superuser(username='admin_weight_test', email='admin_w@test.com', password='password123')
        client = APIClient()
        client.force_authenticate(user=admin_user)

        target_p = self.players[0]
        self.assertEqual(target_p.drop_weight, 0)

        url = f"/api/gacha/admin/packs/{self.pack.id}/players/{target_p.id}/"
        res = client.patch(url, {'drop_weight': 25}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['player']['drop_weight'], 25)
        self.assertEqual(res.data['player']['effective_weight'], 25)

        target_p.refresh_from_db()
        self.assertEqual(target_p.drop_weight, 25)
        self.assertEqual(target_p.get_effective_weight(), 25)

    def test_loyalty_status_isolation_between_teams(self):
        from rest_framework.test import APIClient
        from users.models import User
        from teams.models import Team

        # Create Paris coach and team
        paris_user = User.objects.create_user(username='coach_paris_iso', password='password123')
        paris_team = Team.objects.create(name='Paris Isolation Test', manager=paris_user, gems=1000)

        # Create Liverpool coach and team
        liverpool_user = User.objects.create_user(username='coach_liverpool_iso', password='password123')
        liverpool_team = Team.objects.create(name='Liverpool Isolation Test', manager=liverpool_user, gems=1000)

        # Give Paris 3 consecutive low card openings
        for _ in range(3):
            open_res = open_pack(paris_team.id, self.pack.id, payment_method='GEMS')
            self.assertTrue(open_res['success'])
            low_card = [c for c in open_res['cards'] if c['overall'] < 94][0]
            pick_res = pick_card(open_res['session_id'], low_card['id'], paris_team.id)
            self.assertTrue(pick_res['success'])

        # Liverpool has opened 0 packs!

        # 1. Test Paris client fetching packs:
        paris_client = APIClient()
        paris_client.force_authenticate(user=paris_user)
        res_paris = paris_client.get('/api/gacha/packs/')
        self.assertEqual(res_paris.status_code, 200)
        paris_pack_data = [p for p in res_paris.data if p['id'] == self.pack.id][0]
        self.assertTrue(paris_pack_data['loyalty_status']['is_hard_guaranteed'])
        self.assertEqual(paris_pack_data['loyalty_status']['consecutive_opens'], 3)
        self.assertEqual(paris_pack_data['loyalty_status']['opens_until_boost'], 0)

        # 2. Test Liverpool client fetching packs (with and without team_id param):
        liverpool_client = APIClient()
        liverpool_client.force_authenticate(user=liverpool_user)

        res_liv = liverpool_client.get('/api/gacha/packs/')
        self.assertEqual(res_liv.status_code, 200)
        liv_pack_data = [p for p in res_liv.data if p['id'] == self.pack.id][0]
        self.assertFalse(liv_pack_data['loyalty_status']['is_hard_guaranteed'])
        self.assertFalse(liv_pack_data['loyalty_status']['is_loyalty_boost_active'])
        self.assertEqual(liv_pack_data['loyalty_status']['consecutive_opens'], 0)
        self.assertEqual(liv_pack_data['loyalty_status']['opens_until_boost'], 3)

        res_liv_param = liverpool_client.get(f'/api/gacha/packs/?team_id={liverpool_team.id}')
        self.assertEqual(res_liv_param.status_code, 200)
        liv_pack_data_param = [p for p in res_liv_param.data if p['id'] == self.pack.id][0]
        self.assertFalse(liv_pack_data_param['loyalty_status']['is_hard_guaranteed'])
        self.assertEqual(liv_pack_data_param['loyalty_status']['consecutive_opens'], 0)


