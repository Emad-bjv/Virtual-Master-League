from django.urls import path
from .views import StorePackageListView, PaymentRequestView, PaymentVerifyView

urlpatterns = [
    path('store/packages/', StorePackageListView.as_view(), name='store-packages'),
    path('payment/request/', PaymentRequestView.as_view(), name='payment-request'),
    path('payment/verify/', PaymentVerifyView.as_view(), name='payment-verify'),
]
