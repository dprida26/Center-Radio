from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ProductViewSet, PromotionViewSet, CompanyConfigViewSet, CompanyInfoViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'promotions', PromotionViewSet)
router.register(r'config', CompanyConfigViewSet, basename='config')
router.register(r'company-info', CompanyInfoViewSet, basename='company-info')

urlpatterns = [
    path('', include(router.urls)),
]
