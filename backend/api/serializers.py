from rest_framework import serializers
from .models import Category, Product, Promotion, CompanyConfig, CompanyInfo

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ['id', 'name', 'description', 'discount_percent', 'interest_percent', 'start_date', 'end_date', 'is_active', 'products']

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

class CompanyInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyInfo
        fields = [
            'id', 'name', 'phone', 'whatsapp', 'email', 'address',
            'facebook_url', 'instagram_url', 'twitter_url', 'youtube_url', 'linkedin_url',
            'about_text', 'logo', 'updated_at'
        ]
