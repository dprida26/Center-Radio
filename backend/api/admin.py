from django.contrib import admin
from .models import Category, Product, Promotion, CompanyConfig, CompanyInfo

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'stock', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'created_at']
    search_fields = ['name', 'brand', 'model']
    filter_horizontal = ['promotions'] if hasattr(Product, 'promotions') else []

@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ['name', 'discount_percent', 'start_date', 'end_date', 'is_active']
    list_filter = ['is_active', 'start_date', 'end_date']
    search_fields = ['name']

@admin.register(CompanyConfig)
class CompanyConfigAdmin(admin.ModelAdmin):
    list_display = ['name', 'value']
    search_fields = ['name']

@admin.register(CompanyInfo)
class CompanyInfoAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'updated_at']
    fieldsets = (
        ('Información General', {
            'fields': ('name', 'logo', 'about_text')
        }),
        ('Contacto', {
            'fields': ('phone', 'whatsapp', 'email', 'address')
        }),
        ('Redes Sociales', {
            'fields': ('facebook_url', 'instagram_url', 'twitter_url', 'youtube_url', 'linkedin_url'),
            'classes': ('collapse',)
        }),
    )
