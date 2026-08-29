import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tienda.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Category, Product, Promotion
from django.utils import timezone
from datetime import timedelta

# Crear superusuario
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@tienda.local', 'admin123')
    print("✅ Superusuario creado: admin / admin123")
else:
    print("ℹ️ Superusuario admin ya existe")

# Crear categorías
categories = [
    Category.objects.get_or_create(name='Refrigeradores', defaults={'description': 'Refrigeradores y congeladores'})[0],
    Category.objects.get_or_create(name='Lavadoras', defaults={'description': 'Lavadoras automáticas'})[0],
    Category.objects.get_or_create(name='Microondas', defaults={'description': 'Hornos microondas'})[0],
    Category.objects.get_or_create(name='Televisores', defaults={'description': 'Smart TVs y televisores'})[0],
]
print(f"✅ {len(categories)} categorías listas")

# Crear productos
products_data = [
    {'name': 'Refrigerador Samsung 600L', 'category': categories[0], 'price': 1200, 'brand': 'Samsung', 'model': 'RF28', 'stock': 5},
    {'name': 'Refrigerador LG 500L', 'category': categories[0], 'price': 950, 'brand': 'LG', 'model': 'GT50', 'stock': 3},
    {'name': 'Lavadora LG 10kg', 'category': categories[1], 'price': 650, 'brand': 'LG', 'model': 'WF10', 'stock': 8},
    {'name': 'Lavadora Whirlpool 8kg', 'category': categories[1], 'price': 500, 'brand': 'Whirlpool', 'model': 'WF8', 'stock': 6},
    {'name': 'Microondas Samsung 30L', 'category': categories[2], 'price': 250, 'brand': 'Samsung', 'model': 'MS30', 'stock': 12},
    {'name': 'Microondas LG 25L', 'category': categories[2], 'price': 180, 'brand': 'LG', 'model': 'MS25', 'stock': 10},
    {'name': 'Smart TV 55 pulgadas', 'category': categories[3], 'price': 800, 'brand': 'Samsung', 'model': 'UE55', 'stock': 4},
    {'name': 'Smart TV 43 pulgadas', 'category': categories[3], 'price': 450, 'brand': 'LG', 'model': 'UP43', 'stock': 7},
]

created_count = 0
for data in products_data:
    product, created = Product.objects.get_or_create(
        name=data['name'],
        defaults={
            'category': data['category'],
            'price': data['price'],
            'brand': data['brand'],
            'model': data['model'],
            'stock': data['stock'],
            'description': f"Producto de {data['brand']}, modelo {data['model']}"
        }
    )
    if created:
        created_count += 1

print(f"✅ {created_count} productos creados ({Product.objects.count()} total)")

# Crear promociones
now = timezone.now()
promo1, _ = Promotion.objects.get_or_create(
    name='Promoción Verano 2026',
    defaults={
        'description': '20% de descuento en electrodomésticos seleccionados',
        'discount_percent': 20,
        'start_date': now,
        'end_date': now + timedelta(days=30),
        'is_active': True
    }
)

promo2, _ = Promotion.objects.get_or_create(
    name='Descuento en Refrigeradores',
    defaults={
        'description': '15% de descuento en todos los refrigeradores',
        'discount_percent': 15,
        'start_date': now,
        'end_date': now + timedelta(days=15),
        'is_active': True
    }
)

# Agregar productos a promociones
for product in Product.objects.filter(category__name='Refrigeradores'):
    promo1.products.add(product)
    promo2.products.add(product)

print(f"✅ {Promotion.objects.count()} promociones activas")
print("\n🎉 Datos de ejemplo cargados exitosamente")
