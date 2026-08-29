from rest_framework import serializers
from .models import Category, Product, Promotion, CompanyConfig

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ['id', 'name', 'description', 'discount_percent', 'start_date', 'end_date', 'is_active']

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    promotions = PromotionSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'category', 'category_name', 'image', 'brand', 'model', 'stock', 'is_active', 'promotions', 'created_at', 'updated_at']

class CompanyConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyConfig
        fields = ['id', 'name', 'value']
