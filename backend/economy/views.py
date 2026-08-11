from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import StorePackage, Transaction
from .serializers import StorePackageSerializer, TransactionSerializer
from .services import request_zarinpal_payment, verify_zarinpal_payment
from django.conf import settings
import urllib.parse


class StorePackageListView(generics.ListAPIView):
    """
    Returns a list of active store packages available for purchase.
    """
    queryset = StorePackage.objects.filter(is_active=True)
    serializer_class = StorePackageSerializer
    permission_classes = [AllowAny]


class PaymentRequestView(views.APIView):
    """
    Initiates a payment request. Requires package_id.
    """
    # permission_classes = [IsAuthenticated] # Will be added in Phase 2 auth
    throttle_scope = 'payment'

    def post(self, request):
        package_id = request.data.get('package_id')
        callback_url = request.data.get('callback_url', 'http://localhost:5173/payment/verify') # React route
        
        # In a real system, we'd get team from request.user.team
        # For now, we take team_id from request data if user is not authenticated
        team_id = request.data.get('team_id')
        
        if not package_id or not team_id:
            return Response({"error": "package_id and team_id are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            package = StorePackage.objects.get(id=package_id, is_active=True)
        except StorePackage.DoesNotExist:
            return Response({"error": "Invalid or inactive package."}, status=status.HTTP_400_BAD_REQUEST)
            
        from teams.models import Team
        try:
            team = Team.objects.get(id=team_id)
        except Team.DoesNotExist:
             return Response({"error": "Team not found."}, status=status.HTTP_400_BAD_REQUEST)
             
        # Call service
        result = request_zarinpal_payment(team, package, callback_url)
        
        if result['success']:
            return Response({"payment_url": result['payment_url'], "transaction_id": result['transaction_id']})
        else:
            return Response({"error": result['error']}, status=status.HTTP_400_BAD_REQUEST)


class PaymentVerifyView(views.APIView):
    """
    Verifies a payment request coming back from ZarinPal.
    """
    throttle_scope = 'payment'
    
    def get(self, request):
        authority = request.query_params.get('Authority')
        payment_status = request.query_params.get('Status')
        txn_id = request.query_params.get('txn_id')
        
        if not authority or not txn_id:
            return Response({"error": "Missing parameters."}, status=status.HTTP_400_BAD_REQUEST)
            
        if payment_status != 'OK':
            try:
                txn = Transaction.objects.get(id=txn_id, zarinpal_authority=authority)
                txn.status = 'FAILED'
                txn.description += " | کاربر پرداخت را لغو کرد."
                txn.save(update_fields=['status', 'description'])
            except Transaction.DoesNotExist:
                pass
            return Response({"success": False, "error": "پرداخت توسط کاربر لغو شد یا ناموفق بود."}, status=status.HTTP_400_BAD_REQUEST)
            
        result = verify_zarinpal_payment(authority, txn_id)
        
        if result['success']:
            return Response({
                "success": True, 
                "ref_id": result['ref_id'], 
                "new_budget": result['new_budget']
            })
        else:
            return Response({"success": False, "error": result['error']}, status=status.HTTP_400_BAD_REQUEST)
