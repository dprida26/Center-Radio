from rest_framework import viewsets, filters, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from django.db.models import Q, Sum, Count, F
from django.db.models.functions import TruncMonth
from datetime import timedelta
from .models import Category, Product, ProductImage, Promotion, CompanyInfo, Customer, Sale, Installment, Order
from .serializers import (
    CategorySerializer, ProductSerializer, PromotionSerializer, CompanyInfoSerializer,
    CustomerSerializer, SaleSerializer, InstallmentSerializer, OrderSerializer, ProductImageSerializer,
)

class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['name'] = user.get_full_name() or user.username
        token['is_staff'] = user.is_staff
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = {
            'username': self.user.username,
            'name': self.user.get_full_name() or self.user.username,
            'is_staff': self.user.is_staff,
        }
        return data


class AdminTokenObtainPairView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    return Response({
        'username': request.user.username,
        'name': request.user.get_full_name() or request.user.username,
        'is_staff': request.user.is_staff,
    })


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'brand', 'model']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'on_promotion'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.request.query_params.get('include_inactive'):
            queryset = Product.objects.all()
        else:
            queryset = super().get_queryset()

        category_id = self.request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        return queryset

    @action(detail=False, methods=['get'])
    def on_promotion(self, request):
        now = timezone.now()
        products_on_promo = Product.objects.filter(
            is_active=True,
            promotions__is_active=True,
            promotions__start_date__lte=now,
            promotions__end_date__gte=now
        ).distinct()

        serializer = self.get_serializer(products_on_promo, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='images')
    def upload_images(self, request, pk=None):
        product = self.get_object()
        files = request.FILES.getlist('images')
        if not files:
            return Response({'error': 'No se recibieron imágenes.'}, status=400)

        last_order = product.images.count()
        created = []
        for i, f in enumerate(files):
            created.append(ProductImage.objects.create(product=product, image=f, order=last_order + i))

        serializer = ProductImageSerializer(created, many=True, context={'request': request})
        return Response(serializer.data, status=201)

    @action(detail=True, methods=['delete'], url_path='images/(?P<image_id>[^/.]+)')
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        try:
            image = product.images.get(pk=image_id)
        except ProductImage.DoesNotExist:
            return Response({'error': 'Imagen no encontrada.'}, status=404)
        image.delete()
        return Response(status=204)

class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'active'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def active(self, request):
        now = timezone.now()
        active_promos = Promotion.objects.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gte=now
        )
        serializer = self.get_serializer(active_promos, many=True)
        return Response(serializer.data)

class CompanyInfoViewSet(viewsets.ModelViewSet):
    queryset = CompanyInfo.objects.all()
    serializer_class = CompanyInfoSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'current'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def current(self, request):
        company = CompanyInfo.objects.first()
        if company:
            serializer = self.get_serializer(company)
            return Response(serializer.data)
        return Response({'error': 'Company info not found'}, status=404)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('full_name')
    serializer_class = CustomerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'document_number', 'phone', 'email']

    @action(detail=True, methods=['get'])
    def sales(self, request, pk=None):
        customer = self.get_object()
        sales = customer.sales.all().order_by('-sale_date')
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data)


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all().select_related('customer', 'product').order_by('-sale_date', '-created_at')
    serializer_class = SaleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['customer__full_name', 'customer__document_number', 'product__name']


class InstallmentViewSet(viewsets.ModelViewSet):
    queryset = Installment.objects.all().select_related('sale', 'sale__customer', 'sale__product')
    serializer_class = InstallmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        today = timezone.now().date()
        qs.filter(status=Installment.STATUS_PENDING, due_date__lt=today).update(status=Installment.STATUS_OVERDUE)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            qs = qs.filter(sale__customer_id=customer_id)

        due_before = self.request.query_params.get('due_before')
        if due_before:
            qs = qs.filter(due_date__lte=due_before)

        return qs.order_by('due_date')

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        installment = self.get_object()
        paid_amount = request.data.get('paid_amount')
        installment.mark_as_paid(paid_amount=paid_amount)
        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def revert_payment(self, request, pk=None):
        installment = self.get_object()
        if installment.status != Installment.STATUS_PAID:
            return Response({'error': 'Esta cuota no está marcada como pagada.'}, status=400)
        installment.revert_payment()
        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        today = timezone.now().date()

        Installment.objects.filter(status=Installment.STATUS_PENDING, due_date__lt=today).update(
            status=Installment.STATUS_OVERDUE
        )

        totals = Installment.objects.aggregate(
            total_pending=Sum('amount', filter=Q(status=Installment.STATUS_PENDING)),
            total_overdue=Sum('amount', filter=Q(status=Installment.STATUS_OVERDUE)),
            total_paid=Sum('amount', filter=Q(status=Installment.STATUS_PAID)),
        )

        sales_by_month = list(
            Sale.objects.annotate(month=TruncMonth('sale_date'))
            .values('month')
            .annotate(total=Sum('unit_price'), count=Count('id'))
            .order_by('-month')[:12]
        )

        top_debtors = Customer.objects.annotate(
            debt=Sum('sales__installments__amount', filter=Q(sales__installments__status__in=[
                Installment.STATUS_PENDING, Installment.STATUS_OVERDUE
            ])),
            overdue_count=Count('sales__installments', filter=Q(sales__installments__status=Installment.STATUS_OVERDUE)),
        ).filter(debt__gt=0).order_by('-debt')[:10]

        upcoming = Installment.objects.filter(
            status=Installment.STATUS_PENDING,
            due_date__gte=today,
            due_date__lte=today + timedelta(days=7),
        ).select_related('sale', 'sale__customer').order_by('due_date')

        overdue = Installment.objects.filter(
            status=Installment.STATUS_OVERDUE
        ).select_related('sale', 'sale__customer').order_by('due_date')

        return Response({
            'totals': {k: str(v or 0) for k, v in totals.items()},
            'sales_by_month': [
                {'month': row['month'].isoformat(), 'total': str(row['total']), 'count': row['count']}
                for row in sales_by_month
            ],
            'top_debtors': [
                {
                    'id': c.id, 'full_name': c.full_name, 'document_number': c.document_number,
                    'debt': str(c.debt), 'overdue_count': c.overdue_count,
                } for c in top_debtors
            ],
            'upcoming_installments': InstallmentSerializer(upcoming, many=True).data,
            'overdue_installments': InstallmentSerializer(overdue, many=True).data,
        })


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().prefetch_related('items', 'items__product').order_by('-created_at')
    serializer_class = OrderSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['customer_name', 'customer_phone', 'customer_document', 'customer_email']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = dict(Order.STATUS_CHOICES)
        if new_status not in valid_statuses:
            return Response({'error': 'Estado inválido.'}, status=400)
        order.status = new_status
        order.save()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def convert_to_sale(self, request, pk=None):
        order = self.get_object()

        if order.status == Order.STATUS_CONVERTED:
            return Response({'error': 'Este pedido ya fue convertido en venta.'}, status=400)

        items = list(order.items.select_related('product').all())
        if not items:
            return Response({'error': 'El pedido no tiene productos.'}, status=400)

        for item in items:
            if item.product.stock < item.quantity:
                return Response({
                    'error': f'Stock insuficiente para "{item.product.name}". Disponible: {item.product.stock}'
                }, status=400)

        document = order.customer_document.strip() if order.customer_document else ''
        if document:
            customer, _ = Customer.objects.get_or_create(
                document_number=document,
                defaults={
                    'full_name': order.customer_name,
                    'phone': order.customer_phone,
                    'email': order.customer_email,
                    'address': order.customer_address,
                },
            )
        else:
            customer = Customer.objects.create(
                full_name=order.customer_name,
                document_number=f'PEDIDO-{order.id}',
                phone=order.customer_phone,
                email=order.customer_email,
                address=order.customer_address,
            )

        today = timezone.now().date()
        created_sales = []
        for item in items:
            sale = Sale.objects.create(
                customer=customer,
                product=item.product,
                quantity=item.quantity,
                unit_price=item.unit_price,
                payment_type=order.payment_type,
                installment_count=order.installment_count if order.payment_type == Order.PAYMENT_INSTALLMENTS else 1,
                sale_date=today,
                notes=f'Generada desde Pedido #{order.id}. {order.notes}'.strip(),
            )
            sale.generate_installments()
            Product.objects.filter(pk=item.product_id).update(stock=F('stock') - item.quantity)
            created_sales.append(sale)

        order.status = Order.STATUS_CONVERTED
        order.linked_sale = created_sales[0]
        order.save()

        return Response({
            'order': self.get_serializer(order).data,
            'sale_ids': [s.id for s in created_sales],
        })
