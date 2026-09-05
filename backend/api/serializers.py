from rest_framework import serializers
from django.db.models import Sum, Q, F
from .models import Category, Product, ProductImage, Promotion, CompanyInfo, Customer, Sale, Installment, Order, OrderItem

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'product_count', 'created_at', 'updated_at']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()

class PromotionSerializer(serializers.ModelSerializer):
    products_detail = serializers.SerializerMethodField()

    class Meta:
        model = Promotion
        fields = [
            'id', 'name', 'description', 'discount_percent', 'interest_percent',
            'start_date', 'end_date', 'is_active', 'products', 'products_detail',
        ]

    def get_products_detail(self, obj):
        return [{'id': p.id, 'name': p.name, 'price': str(p.price)} for p in obj.products.all()]

class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'order']

    def get_image_url(self, obj):
        request = self.context.get('request')
        url = obj.image.url
        return request.build_absolute_uri(url) if request else url


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    promotions = PromotionSerializer(many=True, read_only=True)
    discounted_price = serializers.SerializerMethodField()
    first_image = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    installment_options_list = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'discounted_price', 'category', 'category_name', 'image', 'first_image', 'images', 'brand', 'model', 'stock', 'is_active', 'promotions', 'installment_options', 'installment_options_list', 'installment_interest_rate', 'created_at', 'updated_at']

    def get_discounted_price(self, obj):
        return obj.get_discounted_price()

    def get_first_image(self, obj):
        url = obj.get_first_image()
        if not url:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_installment_options_list(self, obj):
        try:
            return [int(x.strip()) for x in obj.installment_options.split(',') if x.strip()]
        except (ValueError, AttributeError):
            return [3, 6, 12]

class CompanyInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyInfo
        fields = [
            'id', 'name', 'legal_name', 'ruc', 'business_hours', 'phone', 'whatsapp', 'email', 'address',
            'facebook_url', 'instagram_url', 'twitter_url', 'youtube_url', 'linkedin_url',
            'about_text', 'logo', 'updated_at'
        ]


class CustomerSerializer(serializers.ModelSerializer):
    total_debt = serializers.SerializerMethodField()
    overdue_count = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'full_name', 'document_number', 'phone', 'email', 'address',
            'total_debt', 'overdue_count', 'created_at', 'updated_at',
        ]

    def get_total_debt(self, obj):
        total = Installment.objects.filter(
            sale__customer=obj, status__in=[Installment.STATUS_PENDING, Installment.STATUS_OVERDUE]
        ).aggregate(total=Sum('amount'))['total']
        return str(total or 0)

    def get_overdue_count(self, obj):
        return Installment.objects.filter(sale__customer=obj, status=Installment.STATUS_OVERDUE).count()


class InstallmentSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='sale.customer.full_name', read_only=True)
    customer_id = serializers.IntegerField(source='sale.customer.id', read_only=True)
    product_name = serializers.CharField(source='sale.product.name', read_only=True)
    installment_count = serializers.IntegerField(source='sale.installment_count', read_only=True)

    class Meta:
        model = Installment
        fields = [
            'id', 'sale', 'number', 'amount', 'due_date', 'status', 'paid_date', 'paid_amount',
            'customer_name', 'customer_id', 'product_name', 'installment_count',
        ]
        read_only_fields = ['id', 'sale', 'number', 'amount', 'due_date']


class SaleSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    total_amount = serializers.SerializerMethodField()
    installments = InstallmentSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'customer', 'customer_name', 'product', 'product_name', 'quantity',
            'unit_price', 'payment_type', 'installment_count', 'interest_rate',
            'sale_date', 'notes', 'total_amount', 'installments', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_total_amount(self, obj):
        return str(obj.total_amount)

    def validate(self, data):
        product = data.get('product') or getattr(self.instance, 'product', None)
        quantity = data.get('quantity') or getattr(self.instance, 'quantity', 1)
        if product and quantity and product.stock < quantity:
            raise serializers.ValidationError({
                'quantity': f'Stock insuficiente. Disponible: {product.stock}'
            })
        return data

    def create(self, validated_data):
        sale = super().create(validated_data)
        sale.generate_installments()
        Product.objects.filter(pk=sale.product_id).update(stock=F('stock') - sale.quantity)
        return sale


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_image', 'quantity', 'unit_price', 'subtotal']

    def get_product_image(self, obj):
        url = obj.product.get_first_image()
        if not url:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_subtotal(self, obj):
        return str(obj.subtotal)


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    total_amount = serializers.SerializerMethodField()
    linked_sale_customer_id = serializers.IntegerField(source='linked_sale.customer_id', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'customer_name', 'customer_phone', 'customer_email', 'customer_document',
            'customer_address', 'payment_type', 'installment_count', 'notes', 'status',
            'linked_sale', 'linked_sale_customer_id', 'items', 'total_amount', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'linked_sale', 'created_at', 'updated_at']

    def get_total_amount(self, obj):
        return str(obj.total_amount)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('El pedido debe tener al menos un producto.')
        return items

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        return order
