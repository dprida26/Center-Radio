from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CategoryViewSet, ProductViewSet, PromotionViewSet, CompanyInfoViewSet,
    CustomerViewSet, SaleViewSet, InstallmentViewSet, OrderViewSet, ExpenseViewSet,
    AuditLogViewSet, AdminTokenObtainPairView, me, reports,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'promotions', PromotionViewSet)
router.register(r'company-info', CompanyInfoViewSet, basename='company-info')
router.register(r'customers', CustomerViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'installments', InstallmentViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('auth/login/', AdminTokenObtainPairView.as_view(), name='auth-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', me, name='auth-me'),
    path('reports/', reports, name='reports'),
    path('', include(router.urls)),
]
