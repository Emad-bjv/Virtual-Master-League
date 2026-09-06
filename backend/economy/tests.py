from decimal import Decimal
from django.test import TestCase
from unittest.mock import patch
from teams.models import Team
from economy.models import StorePackage, Transaction
from economy.services import process_atomic_wallet_update, request_zarinpal_payment, verify_zarinpal_payment


class EconomyServicesTestCase(TestCase):
    def setUp(self):
        self.team = Team.objects.create(name="Real Madrid", budget=Decimal('100.00'))
        self.package = StorePackage.objects.create(
            name="1000 V-Dollars",
            usd_amount=Decimal('1000.00'),
            price_irr=500000,
            is_active=True
        )

    def test_atomic_wallet_update_deposit(self):
        result = process_atomic_wallet_update(self.team.id, Decimal('50.00'), 'BUDGET', 'MATCH_REWARD', 'Test Deposit')
        self.team.refresh_from_db()
        
        self.assertTrue(result['success'])
        self.assertEqual(self.team.budget, Decimal('150.00'))
        self.assertEqual(Transaction.objects.count(), 1)
        
        txn = Transaction.objects.first()
        self.assertEqual(txn.amount, Decimal('50.00'))
        self.assertEqual(txn.transaction_type, 'MATCH_REWARD')

    def test_atomic_wallet_update_withdraw_success(self):
        result = process_atomic_wallet_update(self.team.id, Decimal('-50.00'), 'BUDGET', 'TRANSFER_BUY', 'Test Withdraw')
        self.team.refresh_from_db()
        
        self.assertTrue(result['success'])
        self.assertEqual(self.team.budget, Decimal('50.00'))

    def test_atomic_wallet_update_withdraw_fail_insufficient_funds(self):
        result = process_atomic_wallet_update(self.team.id, Decimal('-150.00'), 'BUDGET', 'TRANSFER_BUY', 'Test Withdraw')
        self.team.refresh_from_db()
        
        self.assertFalse(result['success'])
        self.assertEqual(result['error'], 'موجودی کافی نیست.')
        self.assertEqual(self.team.budget, Decimal('100.00')) # Unchanged
        self.assertEqual(Transaction.objects.count(), 0)

    @patch('economy.services.requests.post')
    def test_request_zarinpal_payment_success(self, mock_post):
        # Mock successful Zarinpal response
        mock_response = mock_post.return_value
        mock_response.text = '{"data": {"code": 100, "authority": "A12345678901234567890123456789012345"}}'
        mock_response.json.return_value = {"data": {"code": 100, "authority": "A12345678901234567890123456789012345"}}
        
        result = request_zarinpal_payment(self.team, self.package, 'http://localhost/cb')
        
        self.assertTrue(result['success'])
        self.assertIn('A12345678901234567890123456789012345', result['payment_url'])
        
        txn = Transaction.objects.get(id=result['transaction_id'])
        self.assertEqual(txn.status, 'PENDING')
        self.assertEqual(txn.zarinpal_authority, 'A12345678901234567890123456789012345')

    @patch('economy.services.requests.post')
    def test_verify_zarinpal_payment_success(self, mock_post):
        # Create pending transaction
        txn = Transaction.objects.create(
            team=self.team,
            amount=self.package.usd_amount,
            amount_irr=self.package.price_irr,
            transaction_type='STORE_PURCHASE',
            status='PENDING',
            zarinpal_authority='A1234567890'
        )
        
        # Mock verification response
        mock_response = mock_post.return_value
        mock_response.text = '{"data": {"code": 100, "ref_id": 987654321}}'
        mock_response.json.return_value = {"data": {"code": 100, "ref_id": 987654321}}
        
        result = verify_zarinpal_payment('A1234567890', txn.id)
        
        self.assertTrue(result['success'])
        self.assertEqual(result['ref_id'], 987654321)
        
        self.team.refresh_from_db()
        # Initial 100 + 1000 from package
        self.assertEqual(self.team.budget, Decimal('1100.00'))
        
        txn.refresh_from_db()
        self.assertEqual(txn.status, 'SUCCESS')
        self.assertEqual(txn.zarinpal_ref_id, '987654321')

    def test_gem_wallet_operations(self):
        # Deposit Gems
        res = process_atomic_wallet_update(self.team.id, Decimal('50'), 'GEMS', 'MATCH_REWARD', '50 gems won')
        self.assertTrue(res['success'])
        self.team.refresh_from_db()
        self.assertEqual(self.team.gems, 50)

        # Withdraw Gems
        res2 = process_atomic_wallet_update(self.team.id, Decimal('-20'), 'GEMS', 'STAMINA_RECOVERY', 'stamina recovery')
        self.assertTrue(res2['success'])
        self.team.refresh_from_db()
        self.assertEqual(self.team.gems, 30)

        # Insufficient Gems
        res3 = process_atomic_wallet_update(self.team.id, Decimal('-100'), 'GEMS', 'FACILITY_UPGRADE', 'facility upgrade')
        self.assertFalse(res3['success'])
        self.team.refresh_from_db()
        self.assertEqual(self.team.gems, 30)

    def test_match_gem_reward_and_underdog_bonus(self):
        from economy.formulas import calculate_match_gem_reward
        from teams.models import Player

        opponent = Team.objects.create(name="Strong Opponent", budget=1000)
        # Create players for underdog test
        Player.objects.create(team=self.team, name="P1", age=22, position="CF", overall=70, base_stamina=80, is_starting=True)
        Player.objects.create(team=opponent, name="P2", age=25, position="CF", overall=85, base_stamina=80, is_starting=True)

        # Normal win (not underdog)
        normal_res = calculate_match_gem_reward(self.team, self.team, 'WIN')
        self.assertEqual(normal_res['base_gems'], 10)
        self.assertFalse(normal_res['is_underdog'])

        # Underdog win
        underdog_res = calculate_match_gem_reward(self.team, opponent, 'WIN')
        self.assertEqual(underdog_res['base_gems'], 10)
        self.assertEqual(underdog_res['underdog_gems'], 15)
        self.assertEqual(underdog_res['total_gems'], 25)
        self.assertTrue(underdog_res['is_underdog'])


class MassRewardGrantTestCase(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.admin = User.objects.create_superuser(username='admin_test', password='password123', email='admin@test.com')
        self.coach = User.objects.create_user(username='coach_test', password='password123', email='coach@test.com')

        self.team1 = Team.objects.create(name="Team Alpha", budget=Decimal('1000000.00'), gems=50)
        self.team2 = Team.objects.create(name="Team Beta", budget=Decimal('2000000.00'), gems=20)

    def test_mass_reward_admin_permission(self):
        from rest_framework.test import APIClient
        client = APIClient()

        # Anonymous gets 401
        res = client.get('/api/economy/admin/mass-reward/')
        self.assertIn(res.status_code, [401, 403])

        # Regular coach gets 403
        client.force_authenticate(user=self.coach)
        res = client.get('/api/economy/admin/mass-reward/')
        self.assertEqual(res.status_code, 403)

        # Admin gets 200
        client.force_authenticate(user=self.admin)
        res = client.get('/api/economy/admin/mass-reward/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['grants'], [])

    def test_mass_reward_all_teams_success(self):
        from rest_framework.test import APIClient
        from notifications.models import Notification
        from economy.models import MassRewardGrant

        client = APIClient()
        client.force_authenticate(user=self.admin)

        payload = {
            'title': '🎉 عیدی نوروز',
            'message': 'تبریک سال نو به کلیه مربیان',
            'gems_amount': 100,
            'budget_amount': 500000,
            'target_type': 'ALL'
        }

        res = client.post('/api/economy/admin/mass-reward/', payload, format='json')
        self.assertEqual(res.status_code, 201)

        # Verify teams balances
        self.team1.refresh_from_db()
        self.team2.refresh_from_db()
        self.assertEqual(self.team1.gems, 150) # 50 + 100
        self.assertEqual(self.team1.budget, Decimal('1500000.00')) # 1M + 500k
        self.assertEqual(self.team2.gems, 120) # 20 + 100
        self.assertEqual(self.team2.budget, Decimal('2500000.00')) # 2M + 500k

        # Verify Transactions
        gem_txs = Transaction.objects.filter(transaction_type='AIRDROP_REWARD', currency='GEMS')
        self.assertEqual(gem_txs.count(), 2)
        self.assertEqual(gem_txs.first().amount, Decimal('100.00'))

        budget_txs = Transaction.objects.filter(transaction_type='AIRDROP_REWARD', currency='BUDGET')
        self.assertEqual(budget_txs.count(), 2)
        self.assertEqual(budget_txs.first().amount, Decimal('500000.00'))

        # Verify Notifications
        notifs = Notification.objects.filter(category='REWARD')
        self.assertEqual(notifs.count(), 2)
        self.assertTrue(notifs.first().action_url.startswith('/dashboard?reward_gems=100'))

        # Verify MassRewardGrant
        self.assertEqual(MassRewardGrant.objects.count(), 1)
        grant = MassRewardGrant.objects.first()
        self.assertEqual(grant.teams_count, 2)
        self.assertEqual(grant.gems_amount, 100)

    def test_mass_reward_selected_team(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.admin)

        payload = {
            'title': 'پاداش تکی',
            'gems_amount': 50,
            'budget_amount': 0,
            'target_type': 'SELECTED',
            'team_ids': [self.team1.id]
        }

        res = client.post('/api/economy/admin/mass-reward/', payload, format='json')
        self.assertEqual(res.status_code, 201)

        self.team1.refresh_from_db()
        self.team2.refresh_from_db()
        self.assertEqual(self.team1.gems, 100) # 50 + 50
        self.assertEqual(self.team2.gems, 20)  # Unchanged

    def test_mass_reward_validation_zero_amount(self):
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=self.admin)

        payload = {
            'title': 'پاداش خالی',
            'gems_amount': 0,
            'budget_amount': 0,
            'target_type': 'ALL'
        }

        res = client.post('/api/economy/admin/mass-reward/', payload, format='json')
        self.assertEqual(res.status_code, 400)
