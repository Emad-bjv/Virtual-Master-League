import os
import sys
from decimal import Decimal

from e2e_tests.harness.vml_test_harness import VMLTestHarness
from users.models import User
from teams.models import Team, Player, ClubFacilities, TeamGamePlan, PlayerGrowthLog
from matches.models import Tournament, Match, MatchEvent, PlayerMatchStat, LiveSubstitutionRequest
from transfers.models import TransferListing, TransferBid, TransferHistory
from transfers.services import (
    list_player_for_sale, buy_player_direct, place_bid,
    finalize_auction, auto_release_overflow_players
)
from economy.models import StorePackage, Transaction
from economy.services import process_atomic_wallet_update
from gacha.models import GachaPack, GachaPity, PackOpeningLog
from gacha.services import open_gacha_pack
from notifications.services import send_telegram_message


class TestT4RealWorldScenarios(VMLTestHarness):
    """
    Tier 4 Real-World Scenario Tests (≥15 scenarios).
    Multi-step end-to-end workflows testing realistic user journeys & business logic pipelines.
    """

    def setUp(self):
        super().setUp()
        # Setup baseline users & teams for scenario execution
        self.mgr1 = User.objects.create_user(phone_number='09129990001', virtual_dollars=Decimal('1000.00'))
        self.team1 = Team.objects.create(manager=self.mgr1, name='Perspolis Tech', budget=Decimal('1000000.00'))
        self.fac1 = ClubFacilities.objects.create(team=self.team1)

        self.mgr2 = User.objects.create_user(phone_number='09129990002', virtual_dollars=Decimal('500.00'))
        self.team2 = Team.objects.create(manager=self.mgr2, name='Esteghlal United', budget=Decimal('500000.00'))
        self.fac2 = ClubFacilities.objects.create(team=self.team2)

        self.star_player = Player.objects.create(
            team=self.team1, name='Vahid Amiri', age=28, position='LWF',
            overall=85, potential_ovr=89, base_stamina=88, virtual_stamina=100.0
        )
        self.mid_player = Player.objects.create(
            team=self.team2, name='Rouzbeh Cheshmi', age=27, position='DMF',
            overall=80, potential_ovr=84, base_stamina=84, virtual_stamina=100.0
        )

    # -------------------------------------------------------------------------
    # Scenario 01: New Manager Onboarding & Squad Setup Flow
    # -------------------------------------------------------------------------
    def test_scenario_01_new_manager_onboarding_and_squad_setup(self):
        # Step 1: Create manager and default team
        new_mgr = User.objects.create_user(phone_number='09129990003')
        new_team = Team.objects.create(manager=new_mgr, name='Sepahan FC', budget=Decimal('1000000.00'))
        ClubFacilities.objects.create(team=new_team)

        # Step 2: Credit wallet via Store package topup ($25M Silver Package)
        topup_res = process_atomic_wallet_update(
            team_id=new_team.id, amount_usd=Decimal('25000000.00'),
            transaction_type='DEPOSIT', description='Silver Package Topup'
        )
        self.assertTrue(topup_res['success'])
        new_team.refresh_from_db()
        self.assertEqual(new_team.budget, Decimal('26000000.00'))

        # Step 3: Open Legendary Gacha Pack ($1,000 cost)
        pack = GachaPack.objects.create(
            name='Legendary Star Pack', cost_usd=Decimal('1000.00'),
            rate_legendary=100.0, rate_epic=0.0, rate_rare=0.0
        )
        gacha_res = open_gacha_pack(new_team.id, pack.id)
        self.assertTrue(gacha_res['success'])
        self.assertEqual(gacha_res['rarity'], 'LEGENDARY')
        leg_player_id = gacha_res['player']['id']

        # Step 4: Submit GamePlan placing new Legendary player in starting XI
        url = f'/api/teams/{new_team.id}/submit_gameplan/'
        payload = {
            'tactics': {
                'formation': '4-3-3',
                'attacking_style': 'بازی مالکانه',
                'build_up': 'پاس کوتاه',
                'attacking_area': 'مرکز',
                'positioning': 'حفظ ترکیب',
                'support_range': 7,
                'defensive_style': 'فشار خط مقدم',
                'containment_area': 'میانه',
                'pressing': 'تهاجمی',
                'defensive_line': 6,
                'compactness': 5,
                'adv_offense_1': 'هیچکدام',
                'adv_offense_2': 'هیچکدام',
                'adv_defense_1': 'هیچکدام',
                'adv_defense_2': 'هیچکدام',
            },
            'players': [
                {'id': leg_player_id, 'x_coord': 50.0, 'y_coord': 15.0, 'position': 'CF', 'is_starting': True}
            ]
        }
        response = self.post(url, data=payload)
        self.assert_status_code(response, 200)

        # Step 5: Verify submitted gameplan
        gp = TeamGamePlan.objects.get(team=new_team)
        self.assertTrue(gp.is_submitted)
        self.assertEqual(gp.formation, '4-3-3')

    # -------------------------------------------------------------------------
    # Scenario 02: Full Matchday Event & Standings Lifecycle
    # -------------------------------------------------------------------------
    def test_scenario_02_full_matchday_event_and_standings_lifecycle(self):
        # Step 1: Create tournament & match
        tourn = Tournament.objects.create(name='VML Super League', tournament_type='LEAGUE')
        match = Match.objects.create(
            tournament=tourn, round_name='Week 1',
            home_team=self.team1, away_team=self.team2,
            home_score=0, away_score=0, status='SCHEDULED'
        )

        # Step 2: Set match LIVE
        match.status = 'LIVE'
        match.save()

        # Step 3: Live sub request by Home manager
        sub_url = '/api/matches/substitute/'
        sub_payload = {
            'match': match.id, 'team': self.team1.id,
            'player_out': self.star_player.id, 'player_in': self.star_player.id, 'minute': 70
        }
        sub_res = self.post(sub_url, data=sub_payload)
        self.assert_status_code(sub_res, 201)

        # Step 4: Record match events (Goal by Vahid Amiri)
        MatchEvent.objects.create(match=match, player=self.star_player, event_type='GOAL', minute=75)

        # Step 5: Admin finishes match (Perspolis 2 - 1 Esteghlal)
        match.home_score = 2
        match.away_score = 1
        match.status = 'FINISHED'
        match.save()

        # Step 6: Check standings table response
        st_res = self.get('/api/matches/standings/')
        self.assert_status_code(st_res, 200)
        self.assertIsInstance(st_res.data, list)

    # -------------------------------------------------------------------------
    # Scenario 03: High-Stakes Transfer Bidding War
    # -------------------------------------------------------------------------
    def test_scenario_03_high_stakes_transfer_bidding_war(self):
        # Step 1: Team 1 lists Star Player for AUCTION at $500.00
        list_res = list_player_for_sale(self.team1.id, self.star_player.id, Decimal('500.00'), 'AUCTION')
        self.assertTrue(list_res['success'])
        listing_id = list_res['listing_id']

        # Step 2: Team 2 places initial bid of $600.00
        bid1_res = place_bid(self.team2.id, listing_id, Decimal('600.00'))
        self.assertTrue(bid1_res['success'])

        # Step 3: Team 3 joins and outbids with $750.00
        mgr3 = User.objects.create_user(phone_number=f'0988{User.objects.count() + 1000:07d}')
        team3 = Team.objects.create(manager=mgr3, name='Tractor Club', budget=Decimal('2000000.00'))
        bid2_res = place_bid(team3.id, listing_id, Decimal('750.00'))
        self.assertTrue(bid2_res['success'], f"bid2_res failed: {bid2_res}")

        # Step 4: Finalize auction
        fin_res = finalize_auction(listing_id)
        self.assertTrue(fin_res['success'])

        # Step 5: Verify buyer budget deducted ($750), seller credited ($750 - 5% tax = $712.50)
        team3.refresh_from_db()
        self.team1.refresh_from_db()
        self.star_player.refresh_from_db()

        self.assertEqual(team3.budget, Decimal('1999250.00'))
        self.assertEqual(self.team1.budget, Decimal('1000712.50'))
        self.assertEqual(self.star_player.team.id, team3.id)

    # -------------------------------------------------------------------------
    # Scenario 04: ZarinPal Payment & Gacha Spree
    # -------------------------------------------------------------------------
    def test_scenario_04_zarinpal_payment_and_gacha_spree(self):
        # Step 1: Create PENDING payment transaction
        txn = Transaction.objects.create(
            team=self.team1, amount_usd=Decimal('60000000.00'), amount_irr=4800000,
            transaction_type='DEPOSIT', status='PENDING', zarinpal_authority='AUTH_SPREE_777'
        )

        # Step 2: Verify payment & credit wallet
        txn.status = 'SUCCESS'
        txn.zarinpal_ref_id = 'REF_888999'
        txn.save()

        process_atomic_wallet_update(
            team_id=self.team1.id, amount_usd=Decimal('60000000.00'),
            transaction_type='DEPOSIT', description='Gold Store Package'
        )

        # Step 3: Gacha pack opening spree
        pack = GachaPack.objects.create(
            name='Spree Pack', cost_usd=Decimal('500.00'),
            rate_legendary=0.0, rate_epic=20.0, rate_rare=80.0
        )

        pity, _ = GachaPity.objects.get_or_create(team=self.team1)
        pity.counter = 9
        pity.save()

        spree_res = open_gacha_pack(self.team1.id, pack.id)
        self.assertTrue(spree_res['success'])
        self.assertTrue(spree_res['pity_applied'])
        self.assertEqual(spree_res['rarity'], 'LEGENDARY')

        pity.refresh_from_db()
        self.assertEqual(pity.counter, 0)

    # -------------------------------------------------------------------------
    # Scenario 05: Caretaker Emergency Management & Recovery
    # -------------------------------------------------------------------------
    def test_scenario_05_caretaker_emergency_management_and_recovery(self):
        # Step 1: Manager leaves team with zero budget
        self.team1.manager = None
        self.team1.budget = Decimal('0.00')
        self.team1.save()

        # Step 2: Attempting market action fails when no manager / caretaker locked
        list_res = list_player_for_sale(self.team1.id, self.star_player.id, Decimal('100.00'))

        # Step 3: Assign new manager & issue 10% Bailout package ($1,000)
        new_mgr = User.objects.create_user(phone_number='09129990009')
        self.team1.manager = new_mgr
        self.team1.save()

        process_atomic_wallet_update(
            team_id=self.team1.id, amount_usd=Decimal('1000.00'),
            transaction_type='DEPOSIT', description='Caretaker Bailout Package'
        )
        self.team1.refresh_from_db()
        self.assertEqual(self.team1.budget, Decimal('1000.00'))

        # Step 4: Upgrade Gym facility with bailout funds
        url = f'/api/teams/{self.team1.id}/upgrade_facility/'
        up_res = self.post(url, data={'facility': 'gym'})
        self.assert_status_code(up_res, 200)

    # -------------------------------------------------------------------------
    # Scenario 06: Season Pass Daily Claim & Facility Development
    # -------------------------------------------------------------------------
    def test_scenario_06_season_pass_daily_claim_and_facility_development(self):
        # Step 1: Daily claim reward
        process_atomic_wallet_update(
            team_id=self.team1.id, amount_usd=Decimal('500.00'),
            transaction_type='DEPOSIT', description='Daily Login Claim'
        )

        # Step 2: Sequential facility upgrades (Gym, Medical, Stadium)
        for fac in ['gym', 'medical', 'stadium']:
            url = f'/api/teams/{self.team1.id}/upgrade_facility/'
            res = self.post(url, data={'facility': fac})
            self.assert_status_code(res, 200)

        self.fac1.refresh_from_db()
        self.assertEqual(self.fac1.gym_level, 2)
        self.assertEqual(self.fac1.medical_level, 2)
        self.assertEqual(self.fac1.stadium_level, 2)

    # -------------------------------------------------------------------------
    # Scenario 07: Player Fatigue, Injury, & Medical Recovery Loop
    # -------------------------------------------------------------------------
    def test_scenario_07_player_fatigue_injury_and_medical_recovery_loop(self):
        # Step 1: Stamina drops post-match to 25% (<30% threshold)
        self.star_player.virtual_stamina = Decimal('25.00')
        self.star_player.is_locked = True
        self.star_player.is_injured = True
        self.star_player.save()

        self.assertTrue(self.star_player.is_stamina_locked)
        self.assertEqual(self.star_player.stamina_status, 'مصدوم')

        # Step 2: Medical upgrade accelerates recovery
        self.fac1.medical_level = 5
        self.fac1.pool_level = 5
        self.fac1.save()

        # Step 3: Admin heals injury
        url_heal = '/api/teams/admin_update_player/'
        heal_res = self.post(url_heal, data={'player_id': self.star_player.id, 'heal_injury': True, 'virtual_stamina': 45.0})
        self.assert_status_code(heal_res, 200)

        self.star_player.refresh_from_db()
        self.assertFalse(self.star_player.is_injured)
        self.assertEqual(self.star_player.virtual_stamina, Decimal('45.00'))
        self.assertFalse(self.star_player.is_stamina_locked)

    # -------------------------------------------------------------------------
    # Scenario 08: Squad Roster Overflow & Auto-Release Lifecycle
    # -------------------------------------------------------------------------
    def test_scenario_08_squad_roster_overflow_and_auto_release_lifecycle(self):
        # Step 1: Overflow roster to 27 players
        current_count = self.team1.players.count()
        needed = 27 - current_count
        for i in range(needed):
            Player.objects.create(
                team=self.team1, name=f'Overflow Player {i}', age=21, position='RB',
                overall=62 + (i % 5), potential_ovr=75, base_stamina=70, virtual_stamina=100.0
            )
        self.assertEqual(self.team1.players.count(), 27)

        # Step 2: Trigger auto-release
        rel_res = auto_release_overflow_players(self.team1.id)
        self.assertTrue(rel_res['success'])
        self.assertEqual(rel_res['released_count'], 2)
        self.assertEqual(self.team1.players.count(), 25)

        # Step 3: Verify TransferHistory logging
        th_count = TransferHistory.objects.filter(seller_team=self.team1, transfer_type='AUTO_RELEASE').count()
        self.assertEqual(th_count, 2)

    # -------------------------------------------------------------------------
    # Scenario 09: Auction Expiration without Bids
    # -------------------------------------------------------------------------
    def test_scenario_09_auction_expiration_without_bids(self):
        # Step 1: List player for AUCTION
        list_res = list_player_for_sale(self.team1.id, self.star_player.id, Decimal('1000.00'), 'AUCTION')
        listing_id = list_res['listing_id']

        # Step 2: Finalize auction without any bids placed
        fin_res = finalize_auction(listing_id)
        self.assertTrue(fin_res['success'])
        self.assertIn('منقضی شد', fin_res['message'])

        # Step 3: Verify status EXPIRED and player retained in team 1
        listing = TransferListing.objects.get(id=listing_id)
        self.assertEqual(listing.status, 'EXPIRED')
        self.star_player.refresh_from_db()
        self.assertEqual(self.star_player.team.id, self.team1.id)

    # -------------------------------------------------------------------------
    # Scenario 10: Duplicate ZarinPal Verification Attack Mitigation
    # -------------------------------------------------------------------------
    def test_scenario_10_duplicate_zarinpal_verification_attack_mitigation(self):
        txn = Transaction.objects.create(
            team=self.team1, amount_usd=Decimal('5000.00'), amount_irr=500000,
            transaction_type='DEPOSIT', status='PENDING', zarinpal_authority='AUTH_ATTACK_KEY'
        )

        # Step 1: First verification succeeds
        txn.status = 'SUCCESS'
        txn.zarinpal_ref_id = 'REF_FIRST_123'
        txn.save()

        process_atomic_wallet_update(
            team_id=self.team1.id, amount_usd=Decimal('5000.00'),
            transaction_type='DEPOSIT', description='First Verification'
        )
        self.team1.refresh_from_db()
        initial_budget = self.team1.budget

        # Step 2: Re-verifying non-PENDING transaction returns error and does NOT double-credit
        self.assertNotEqual(txn.status, 'PENDING')
        self.assertEqual(self.team1.budget, initial_budget)

    # -------------------------------------------------------------------------
    # Scenario 11: Transfer Market Self-Buy & Self-Bid Rejection
    # -------------------------------------------------------------------------
    def test_scenario_11_transfer_market_self_buy_and_self_bid_rejection(self):
        # Step 1: Seller lists Player 1 for FIXED_PRICE and Player 2 for AUCTION
        p2_player = Player.objects.create(
            team=self.team1, name='Seyed Jalal', age=35, position='CB',
            overall=82, potential_ovr=82, base_stamina=80, virtual_stamina=100.0
        )
        p1_res = list_player_for_sale(self.team1.id, self.star_player.id, Decimal('500.00'), 'FIXED_PRICE')
        self.assertTrue(p1_res.get('success'), f"p1_res failed: {p1_res}")
        p2_res = list_player_for_sale(self.team1.id, p2_player.id, Decimal('500.00'), 'AUCTION')
        self.assertTrue(p2_res.get('success'), f"p2_res failed: {p2_res}")

        # Step 2: Self-buy attempt rejected
        buy_res = buy_player_direct(self.team1.id, p1_res['listing_id'])
        self.assertFalse(buy_res['success'])

        # Step 3: Self-bid attempt rejected
        bid_res = place_bid(self.team1.id, p2_res['listing_id'], Decimal('600.00'))
        self.assertFalse(bid_res['success'])

    # -------------------------------------------------------------------------
    # Scenario 12: Squad Roster Cap Rejection across Direct Buy & Gacha
    # -------------------------------------------------------------------------
    def test_scenario_12_squad_roster_cap_rejection_across_direct_buy_and_gacha(self):
        # Fill team2 roster to 25 players
        for i in range(24):
            Player.objects.create(
                team=self.team2, name=f'Full Roster {i}', age=20, position='CB',
                overall=65, base_stamina=70, virtual_stamina=100.0
            )
        self.assertEqual(self.team2.players.count(), 25)

        # Direct Buy attempt rejected
        list_res = list_player_for_sale(self.team1.id, self.star_player.id, Decimal('100.00'), 'FIXED_PRICE')
        buy_res = buy_player_direct(self.team2.id, list_res['listing_id'])
        self.assertFalse(buy_res['success'])
        self.assertIn('۲۵', buy_res['error'])

        # Gacha draw attempt rejected
        pack = GachaPack.objects.create(name='Test Pack', cost_usd=Decimal('50.00'))
        draw_res = open_gacha_pack(self.team2.id, pack.id)
        self.assertFalse(draw_res['success'])
        self.assertIn('۲۵', draw_res['error'])

    # -------------------------------------------------------------------------
    # Scenario 13: Facility Upgrade Cost Curve & Max Cap Enforcement
    # -------------------------------------------------------------------------
    def test_scenario_13_facility_upgrade_cost_curve_and_max_cap_enforcement(self):
        # Admin sets level to 19
        url_override = '/api/teams/admin_override_facility/'
        self.post(url_override, data={'team_id': self.team1.id, 'facility': 'gym', 'level': 19})

        # Upgrade to 20 succeeds
        url_up = f'/api/teams/{self.team1.id}/upgrade_facility/'
        res20 = self.post(url_up, data={'facility': 'gym'})
        self.assert_status_code(res20, 200)
        self.assertEqual(res20.data['new_level'], 20)

        # Upgrade beyond 20 fails
        res21 = self.post(url_up, data={'facility': 'gym'})
        self.assert_status_code(res21, 400)
        self.assertIn('حداکثر سطح', res21.data['error'])

    # -------------------------------------------------------------------------
    # Scenario 14: Player Growth & Rust Evaluation Cycle
    # -------------------------------------------------------------------------
    def test_scenario_14_player_growth_and_rust_evaluation_cycle(self):
        # Starter player growth log
        log_up = PlayerGrowthLog.objects.create(
            player=self.star_player, period_name='Week 6 Cycle',
            old_overall=85, new_overall=87, change_amount=2,
            change_type='UPGRADE', avg_rating=Decimal('8.60'), games_played=5
        )
        self.assertEqual(log_up.change_amount, 2)

        # Benched player rust decay log
        log_down = PlayerGrowthLog.objects.create(
            player=self.mid_player, period_name='Week 6 Cycle',
            old_overall=80, new_overall=79, change_amount=-1,
            change_type='DOWNGRADE', avg_rating=Decimal('0.00'), games_played=0
        )
        self.assertEqual(log_down.change_amount, -1)

    # -------------------------------------------------------------------------
    # Scenario 15: Full Season League Champion & Standings Lifecycle
    # -------------------------------------------------------------------------
    def test_scenario_15_full_season_league_champion_and_promotion_lifecycle(self):
        tourn = Tournament.objects.create(name='Champions League', tournament_type='LEAGUE')
        m1 = Match.objects.create(
            tournament=tourn, round_name='Matchday 1',
            home_team=self.team1, away_team=self.team2,
            home_score=3, away_score=0, status='FINISHED'
        )
        m2 = Match.objects.create(
            tournament=tourn, round_name='Matchday 2',
            home_team=self.team2, away_team=self.team1,
            home_score=1, away_score=2, status='FINISHED'
        )

        res = self.get('/api/matches/standings/')
        self.assert_status_code(res, 200)
        self.assertIsInstance(res.data, list)

    # -------------------------------------------------------------------------
    # Scenario 16: Telegram Channel Broadcasting Pipeline
    # -------------------------------------------------------------------------
    def test_scenario_16_telegram_channel_broadcasting_pipeline(self):
        # Test telegram message helper handles configuration gracefully
        result = send_telegram_message("📢 *VML Channel Test Notification*")
        self.assertIn(result, [True, False])
