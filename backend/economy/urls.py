from django.urls import path
from .views import (
    StorePackageListView,
    CardToCardInfoView,
    CreatePaymentRequestView,
    UploadReceiptView,
    MyPaymentRequestsView,
    AdminPaymentRequestListView,
    AdminApprovePaymentView,
    TransactionHistoryView,
    TeamRevenueBreakdownView,
    AdminStorePackageListCreateView,
    AdminStorePackageDetailView,
    AdminStorePackageToggleView,
    AdminMassRewardView,
)

urlpatterns = [
    path('store/packages/', StorePackageListView.as_view(), name='store-packages'),
    path('payment/card-info/', CardToCardInfoView.as_view(), name='payment-card-info'),
    path('payment/create/', CreatePaymentRequestView.as_view(), name='payment-create'),
    path('payment/<int:payment_id>/upload-receipt/', UploadReceiptView.as_view(), name='payment-upload-receipt'),
    path('payment/my-requests/', MyPaymentRequestsView.as_view(), name='payment-my-requests'),
    path('payment/admin-list/', AdminPaymentRequestListView.as_view(), name='payment-admin-list'),
    path('payment/<int:payment_id>/admin-review/', AdminApprovePaymentView.as_view(), name='payment-admin-review'),
    path('admin/packages/', AdminStorePackageListCreateView.as_view(), name='admin-store-packages'),
    path('admin/packages/<int:pk>/', AdminStorePackageDetailView.as_view(), name='admin-store-package-detail'),
    path('admin/packages/<int:pk>/toggle/', AdminStorePackageToggleView.as_view(), name='admin-store-package-toggle'),
    path('admin/mass-reward/', AdminMassRewardView.as_view(), name='admin-mass-reward'),
    path('transactions/history/', TransactionHistoryView.as_view(), name='transaction-history'),
    path('teams/<int:team_id>/revenue-breakdown/', TeamRevenueBreakdownView.as_view(), name='team-revenue-breakdown'),
]
