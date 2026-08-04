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
        result = process_atomic_wallet_update(self.team.id, Decimal('50.00'), 'DEPOSIT', 'Test Deposit')
        self.team.refresh_from_db()
        
        self.assertTrue(result['success'])
        self.assertEqual(self.team.budget, Decimal('150.00'))
        self.assertEqual(Transaction.objects.count(), 1)
        
        txn = Transaction.objects.first()
        self.assertEqual(txn.amount_usd, Decimal('50.00'))
        self.assertEqual(txn.transaction_type, 'DEPOSIT')

    def test_atomic_wallet_update_withdraw_success(self):
        result = process_atomic_wallet_update(self.team.id, Decimal('-50.00'), 'WITHDRAW', 'Test Withdraw')
        self.team.refresh_from_db()
        
        self.assertTrue(result['success'])
        self.assertEqual(self.team.budget, Decimal('50.00'))

    def test_atomic_wallet_update_withdraw_fail_insufficient_funds(self):
        result = process_atomic_wallet_update(self.team.id, Decimal('-150.00'), 'WITHDRAW', 'Test Withdraw')
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
            amount_usd=self.package.usd_amount,
            amount_irr=self.package.price_irr,
            transaction_type='DEPOSIT',
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
