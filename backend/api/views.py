from rest_framework import viewsets, filters, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from django.db.models import Q, Sum, Count, F
from django.db.models.functions import TruncMonth, TruncDay, TruncWeek
from datetime import date, timedelta
from .models import (
    Category, Product, ProductImage, Promotion, CompanyInfo, Customer, Sale, Installment, Order, Expense, AuditLog,
    Supplier, PurchaseInvoice, PurchaseInvoiceItem, PurchaseInstallment,
)
from .serializers import (
    CategorySerializer, ProductSerializer, PromotionSerializer, CompanyInfoSerializer,
    CustomerSerializer, SaleSerializer, InstallmentSerializer, OrderSerializer, ProductImageSerializer,
    ExpenseSerializer, StockMovementSerializer, AuditLogSerializer,
    SupplierSerializer, PurchaseInvoiceSerializer, PurchaseInstallmentSerializer,
)
from .audit import AuditMixin, log_action

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
        log_action(self.user, AuditLog.ACTION_CUSTOM, self.user, description='Inició sesión en el panel')
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


class CategoryViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

class ProductViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'brand', 'model']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']
    audit_fields = ['name', 'price', 'cost_price', 'stock', 'is_active']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'on_promotion'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        product = serializer.save()
        if product.stock and product.cost_price and product.cost_price > 0:
            initial_stock = product.stock
            product.stock = 0
            product.save(update_fields=['stock'])
            product.add_stock(initial_stock, note=f'Stock inicial: {initial_stock} x {product.name}')
        log_action(self.request.user, AuditLog.ACTION_CREATE, product)

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

    @action(detail=True, methods=['post'])
    def add_stock(self, request, pk=None):
        product = self.get_object()
        try:
            quantity = int(request.data.get('quantity', 0))
        except (TypeError, ValueError):
            return Response({'error': 'Cantidad inválida.'}, status=400)

        if quantity <= 0:
            return Response({'error': 'La cantidad debe ser mayor a cero.'}, status=400)

        note = request.data.get('note', '')
        supplier = None
        supplier_id = request.data.get('supplier')
        if supplier_id:
            supplier = Supplier.objects.filter(pk=supplier_id).first()

        expense = product.add_stock(quantity, note=note, supplier=supplier)
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, product,
            description=f'Agregó stock: +{quantity} ({note or "sin nota"})',
        )

        return Response({
            'product': self.get_serializer(product).data,
            'expense': ExpenseSerializer(expense, context={'request': request}).data if expense else None,
        })

    @action(detail=True, methods=['post'])
    def adjust_stock(self, request, pk=None):
        product = self.get_object()
        try:
            quantity_delta = int(request.data.get('quantity_delta', 0))
        except (TypeError, ValueError):
            return Response({'error': 'Cantidad inválida.'}, status=400)

        reason = (request.data.get('reason') or '').strip()
        if quantity_delta == 0:
            return Response({'error': 'El ajuste debe ser distinto de cero.'}, status=400)
        if not reason:
            return Response({'error': 'El motivo es obligatorio.'}, status=400)
        if product.stock + quantity_delta < 0:
            return Response({'error': f'El ajuste dejaría el stock en negativo. Stock actual: {product.stock}'}, status=400)

        product.adjust_stock(quantity_delta, reason)
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, product,
            description=f'Ajuste manual de stock: {quantity_delta:+d} ({reason})',
        )
        return Response(self.get_serializer(product).data)

    @action(detail=True, methods=['get'], url_path='movimientos')
    def movements(self, request, pk=None):
        product = self.get_object()
        movements = product.stock_movements.all()
        serializer = StockMovementSerializer(movements, many=True)
        return Response(serializer.data)

class PromotionViewSet(AuditMixin, viewsets.ModelViewSet):
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

class CompanyInfoViewSet(AuditMixin, viewsets.ModelViewSet):
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


class CustomerViewSet(AuditMixin, viewsets.ModelViewSet):
    audit_fields = ['full_name', 'document_number', 'phone', 'email', 'address']
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


class SupplierViewSet(AuditMixin, viewsets.ModelViewSet):
    audit_fields = ['name', 'contact_name', 'phone', 'email', 'address', 'ruc', 'is_active']
    queryset = Supplier.objects.all().order_by('name')
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'contact_name', 'phone', 'email', 'ruc']

    @action(detail=True, methods=['get'])
    def purchases(self, request, pk=None):
        supplier = self.get_object()
        invoices = supplier.purchase_invoices.all().order_by('-purchase_date')
        serializer = PurchaseInvoiceSerializer(invoices, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        supplier = self.get_object()
        products = supplier.usual_products.filter(is_active=True)
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)


class SaleViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = Sale.objects.all().select_related('customer', 'product').order_by('-sale_date', '-created_at')
    serializer_class = SaleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['customer__full_name', 'customer__document_number', 'product__name']

    def perform_create(self, serializer):
        sale = serializer.save()
        sale.generate_installments()
        sale.product.register_sale_exit(sale.quantity, reason=f'Venta #{sale.id}')
        log_action(self.request.user, AuditLog.ACTION_CREATE, sale)


class PurchaseInvoiceViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = PurchaseInvoice.objects.all().select_related('supplier').prefetch_related('items', 'items__product', 'purchase_installments').order_by('-purchase_date', '-created_at')
    serializer_class = PurchaseInvoiceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['supplier__name', 'invoice_number']

    def perform_create(self, serializer):
        invoice = serializer.save()
        skip_expense = invoice.payment_type == PurchaseInvoice.PAYMENT_INSTALLMENTS
        for item in invoice.items.select_related('product').all():
            item.product.add_stock(
                item.quantity,
                note=f'Compra #{invoice.id} - {invoice.supplier.name}',
                skip_expense=skip_expense,
                supplier=invoice.supplier,
            )
            if not item.product.usual_supplier_id:
                item.product.usual_supplier = invoice.supplier
                item.product.save(update_fields=['usual_supplier'])
        invoice.generate_installments()
        log_action(self.request.user, AuditLog.ACTION_CREATE, invoice)


class ExpenseViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(expense_date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(expense_date__lte=date_to)
        return qs


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
        pending_previous = Installment.objects.filter(
            sale=installment.sale, number__lt=installment.number,
        ).exclude(status=Installment.STATUS_PAID).exists()
        if pending_previous:
            return Response(
                {'error': 'No se puede pagar esta cuota sin antes pagar las cuotas anteriores.'},
                status=400,
            )
        paid_amount = request.data.get('paid_amount')
        installment.mark_as_paid(paid_amount=paid_amount)
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, installment,
            description=f'Marcó como pagada la cuota {installment.number} (Gs. {installment.paid_amount})',
        )
        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def revert_payment(self, request, pk=None):
        installment = self.get_object()
        if installment.status != Installment.STATUS_PAID:
            return Response({'error': 'Esta cuota no está marcada como pagada.'}, status=400)
        installment.revert_payment()
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, installment,
            description=f'Revirtió el pago de la cuota {installment.number}',
        )
        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def due_report(self, request):
        from datetime import timedelta
        today = timezone.now().date()
        Installment.objects.filter(status=Installment.STATUS_PENDING, due_date__lt=today).update(
            status=Installment.STATUS_OVERDUE
        )
        days_ahead = int(request.query_params.get('days_ahead', 7))
        qs = Installment.objects.filter(
            status__in=[Installment.STATUS_OVERDUE, Installment.STATUS_PENDING],
            due_date__lte=today + timedelta(days=days_ahead),
        ).select_related('sale', 'sale__customer', 'sale__product').order_by('due_date')
        serializer = self.get_serializer(qs, many=True)
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


class PurchaseInstallmentViewSet(viewsets.ModelViewSet):
    queryset = PurchaseInstallment.objects.all().select_related('purchase_invoice', 'purchase_invoice__supplier')
    serializer_class = PurchaseInstallmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        today = timezone.now().date()
        qs.filter(status=PurchaseInstallment.STATUS_PENDING, due_date__lt=today).update(status=PurchaseInstallment.STATUS_OVERDUE)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        supplier_id = self.request.query_params.get('supplier_id')
        if supplier_id:
            qs = qs.filter(purchase_invoice__supplier_id=supplier_id)

        due_before = self.request.query_params.get('due_before')
        if due_before:
            qs = qs.filter(due_date__lte=due_before)

        return qs.order_by('due_date')

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        installment = self.get_object()
        pending_previous = PurchaseInstallment.objects.filter(
            purchase_invoice=installment.purchase_invoice, number__lt=installment.number,
        ).exclude(status=PurchaseInstallment.STATUS_PAID).exists()
        if pending_previous:
            return Response(
                {'error': 'No se puede pagar esta cuota sin antes pagar las cuotas anteriores.'},
                status=400,
            )
        paid_amount = request.data.get('paid_amount')
        installment.mark_as_paid(paid_amount=paid_amount)
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, installment,
            description=f'Marcó como pagada la cuota {installment.number} a proveedor (Gs. {installment.paid_amount})',
        )
        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def revert_payment(self, request, pk=None):
        installment = self.get_object()
        if installment.status != PurchaseInstallment.STATUS_PAID:
            return Response({'error': 'Esta cuota no está marcada como pagada.'}, status=400)
        installment.revert_payment()
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, installment,
            description=f'Revirtió el pago de la cuota {installment.number} a proveedor',
        )
        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        today = timezone.now().date()

        PurchaseInstallment.objects.filter(status=PurchaseInstallment.STATUS_PENDING, due_date__lt=today).update(
            status=PurchaseInstallment.STATUS_OVERDUE
        )

        totals = PurchaseInstallment.objects.aggregate(
            total_pending=Sum('amount', filter=Q(status=PurchaseInstallment.STATUS_PENDING)),
            total_overdue=Sum('amount', filter=Q(status=PurchaseInstallment.STATUS_OVERDUE)),
            total_paid=Sum('amount', filter=Q(status=PurchaseInstallment.STATUS_PAID)),
        )

        top_creditors = Supplier.objects.annotate(
            debt=Sum('purchase_invoices__purchase_installments__amount', filter=Q(purchase_invoices__purchase_installments__status__in=[
                PurchaseInstallment.STATUS_PENDING, PurchaseInstallment.STATUS_OVERDUE
            ])),
            overdue_count=Count('purchase_invoices__purchase_installments', filter=Q(purchase_invoices__purchase_installments__status=PurchaseInstallment.STATUS_OVERDUE)),
        ).filter(debt__gt=0).order_by('-debt')[:10]

        upcoming = PurchaseInstallment.objects.filter(
            status=PurchaseInstallment.STATUS_PENDING,
            due_date__gte=today,
            due_date__lte=today + timedelta(days=7),
        ).select_related('purchase_invoice', 'purchase_invoice__supplier').order_by('due_date')

        overdue = PurchaseInstallment.objects.filter(
            status=PurchaseInstallment.STATUS_OVERDUE
        ).select_related('purchase_invoice', 'purchase_invoice__supplier').order_by('due_date')

        return Response({
            'totals': {k: str(v or 0) for k, v in totals.items()},
            'top_creditors': [
                {
                    'id': s.id, 'name': s.name,
                    'debt': str(s.debt), 'overdue_count': s.overdue_count,
                } for s in top_creditors
            ],
            'upcoming_installments': PurchaseInstallmentSerializer(upcoming, many=True).data,
            'overdue_installments': PurchaseInstallmentSerializer(overdue, many=True).data,
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
        old_status = order.status
        order.status = new_status
        order.save()
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, order,
            description=f'Cambió el estado del pedido de {old_status} a {new_status}',
        )
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
            item.product.register_sale_exit(item.quantity, reason=f'Venta - Pedido #{order.id}')
            created_sales.append(sale)

        order.status = Order.STATUS_CONVERTED
        order.linked_sale = created_sales[0]
        order.save()
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, order,
            description=f'Convirtió el pedido en {len(created_sales)} venta(s)',
        )

        return Response({
            'order': self.get_serializer(order).data,
            'sale_ids': [s.id for s in created_sales],
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def home_dashboard(request):
    today = timezone.now().date()
    soon = today + timedelta(days=2)

    Installment.objects.filter(status=Installment.STATUS_PENDING, due_date__lt=today).update(
        status=Installment.STATUS_OVERDUE
    )
    PurchaseInstallment.objects.filter(status=PurchaseInstallment.STATUS_PENDING, due_date__lt=today).update(
        status=PurchaseInstallment.STATUS_OVERDUE
    )

    customer_installments = Installment.objects.filter(
        status__in=[Installment.STATUS_OVERDUE, Installment.STATUS_PENDING],
        due_date__lte=soon,
    ).select_related('sale', 'sale__customer', 'sale__product').order_by('due_date')

    supplier_installments = PurchaseInstallment.objects.filter(
        status__in=[PurchaseInstallment.STATUS_OVERDUE, PurchaseInstallment.STATUS_PENDING],
        due_date__lte=soon,
    ).select_related('purchase_invoice', 'purchase_invoice__supplier').order_by('due_date')

    pending_orders = Order.objects.filter(status=Order.STATUS_PENDING).count()

    low_stock_products = Product.objects.filter(
        is_active=True, stock__lte=F('min_stock')
    ).order_by('stock')[:10]

    return Response({
        'pending_orders': pending_orders,
        'customer_installments': InstallmentSerializer(customer_installments, many=True).data,
        'supplier_installments': PurchaseInstallmentSerializer(supplier_installments, many=True).data,
        'low_stock_products': [
            {'id': p.id, 'name': p.name, 'stock': p.stock, 'min_stock': p.min_stock} for p in low_stock_products
        ],
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def reports(request):
    params = request.query_params
    today = timezone.now().date()

    date_from = params.get('date_from')
    date_to = params.get('date_to')
    category_id = params.get('category_id')
    payment_type = params.get('payment_type')

    if not date_from and not date_to:
        date_from = today.replace(day=1) - timedelta(days=365)
        date_to = today
    else:
        date_from = date_from or (today - timedelta(days=365))
        date_to = date_to or today

    Installment.objects.filter(status=Installment.STATUS_PENDING, due_date__lt=today).update(
        status=Installment.STATUS_OVERDUE
    )

    sales_qs = Sale.objects.filter(sale_date__gte=date_from, sale_date__lte=date_to)
    if category_id:
        sales_qs = sales_qs.filter(product__category_id=category_id)
    if payment_type:
        sales_qs = sales_qs.filter(payment_type=payment_type)

    range_days = (date.fromisoformat(str(date_to)) - date.fromisoformat(str(date_from))).days
    trunc_fn = TruncDay if range_days <= 45 else TruncWeek if range_days <= 180 else TruncMonth

    sales_over_time = list(
        sales_qs.annotate(period=trunc_fn('sale_date'))
        .values('period')
        .annotate(total=Sum(F('unit_price') * F('quantity')), count=Count('id'))
        .order_by('period')
    )

    summary = sales_qs.aggregate(
        total_revenue=Sum(F('unit_price') * F('quantity')),
        total_sales=Count('id'),
        total_units=Sum('quantity'),
    )
    total_revenue = summary['total_revenue'] or 0
    total_sales = summary['total_sales'] or 0
    avg_ticket = (total_revenue / total_sales) if total_sales else 0

    by_payment_type = list(
        sales_qs.values('payment_type')
        .annotate(total=Sum(F('unit_price') * F('quantity')), count=Count('id'))
        .order_by('-total')
    )

    top_products = list(
        sales_qs.values('product_id', 'product__name')
        .annotate(units=Sum('quantity'), total=Sum(F('unit_price') * F('quantity')))
        .order_by('-units')[:10]
    )

    top_categories = list(
        sales_qs.values('product__category_id', 'product__category__name')
        .annotate(units=Sum('quantity'), total=Sum(F('unit_price') * F('quantity')))
        .order_by('-total')[:10]
    )

    top_customers = list(
        sales_qs.values('customer_id', 'customer__full_name')
        .annotate(total=Sum(F('unit_price') * F('quantity')), purchases=Count('id'))
        .order_by('-total')[:10]
    )

    installment_totals = Installment.objects.filter(
        sale__in=sales_qs
    ).aggregate(
        pending=Sum('amount', filter=Q(status=Installment.STATUS_PENDING)),
        overdue=Sum('amount', filter=Q(status=Installment.STATUS_OVERDUE)),
        paid=Sum('paid_amount', filter=Q(status=Installment.STATUS_PAID)),
    )

    top_debtors = list(
        Customer.objects.annotate(
            debt=Sum('sales__installments__amount', filter=Q(sales__installments__status__in=[
                Installment.STATUS_PENDING, Installment.STATUS_OVERDUE
            ])),
            overdue_count=Count('sales__installments', filter=Q(sales__installments__status=Installment.STATUS_OVERDUE)),
        ).filter(debt__gt=0).order_by('-debt')[:10]
    )

    PurchaseInstallment.objects.filter(status=PurchaseInstallment.STATUS_PENDING, due_date__lt=today).update(
        status=PurchaseInstallment.STATUS_OVERDUE
    )

    purchase_invoices_qs = PurchaseInvoice.objects.filter(purchase_date__gte=date_from, purchase_date__lte=date_to)

    purchase_installment_totals = PurchaseInstallment.objects.filter(
        purchase_invoice__in=purchase_invoices_qs
    ).aggregate(
        pending=Sum('amount', filter=Q(status=PurchaseInstallment.STATUS_PENDING)),
        overdue=Sum('amount', filter=Q(status=PurchaseInstallment.STATUS_OVERDUE)),
        paid=Sum('paid_amount', filter=Q(status=PurchaseInstallment.STATUS_PAID)),
    )

    top_creditors = list(
        Supplier.objects.annotate(
            debt=Sum('purchase_invoices__purchase_installments__amount', filter=Q(purchase_invoices__purchase_installments__status__in=[
                PurchaseInstallment.STATUS_PENDING, PurchaseInstallment.STATUS_OVERDUE
            ])),
            overdue_count=Count('purchase_invoices__purchase_installments', filter=Q(purchase_invoices__purchase_installments__status=PurchaseInstallment.STATUS_OVERDUE)),
        ).filter(debt__gt=0).order_by('-debt')[:10]
    )

    expenses_qs = Expense.objects.filter(expense_date__gte=date_from, expense_date__lte=date_to)
    total_expenses = expenses_qs.aggregate(total=Sum('amount'))['total'] or 0
    expenses_by_category = list(
        expenses_qs.values('category')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )
    net_profit = total_revenue - total_expenses

    orders_qs = Order.objects.filter(created_at__date__gte=date_from, created_at__date__lte=date_to)
    orders_by_status = list(orders_qs.values('status').annotate(count=Count('id')).order_by('-count'))
    total_orders = orders_qs.count()
    converted_orders = orders_qs.filter(status=Order.STATUS_CONVERTED).count()
    conversion_rate = (converted_orders / total_orders * 100) if total_orders else 0

    return Response({
        'filters_applied': {
            'date_from': str(date_from),
            'date_to': str(date_to),
            'category_id': category_id,
            'payment_type': payment_type,
        },
        'summary': {
            'total_revenue': str(total_revenue),
            'total_sales': total_sales,
            'total_units': summary['total_units'] or 0,
            'avg_ticket': str(round(avg_ticket, 2)),
            'total_expenses': str(total_expenses),
            'net_profit': str(net_profit),
        },
        'sales_over_time': [
            {'period': row['period'].isoformat(), 'total': str(row['total']), 'count': row['count']}
            for row in sales_over_time
        ],
        'by_payment_type': [
            {'payment_type': row['payment_type'], 'total': str(row['total']), 'count': row['count']}
            for row in by_payment_type
        ],
        'top_products': [
            {
                'product_id': row['product_id'], 'name': row['product__name'],
                'units': row['units'], 'total': str(row['total']),
            } for row in top_products
        ],
        'top_categories': [
            {
                'category_id': row['product__category_id'], 'name': row['product__category__name'],
                'units': row['units'], 'total': str(row['total']),
            } for row in top_categories
        ],
        'top_customers': [
            {
                'customer_id': row['customer_id'], 'name': row['customer__full_name'],
                'total': str(row['total']), 'purchases': row['purchases'],
            } for row in top_customers
        ],
        'collections': {
            'pending': str(installment_totals['pending'] or 0),
            'overdue': str(installment_totals['overdue'] or 0),
            'paid': str(installment_totals['paid'] or 0),
        },
        'top_debtors': [
            {
                'id': c.id, 'full_name': c.full_name, 'document_number': c.document_number,
                'debt': str(c.debt), 'overdue_count': c.overdue_count,
            } for c in top_debtors
        ],
        'payables': {
            'pending': str(purchase_installment_totals['pending'] or 0),
            'overdue': str(purchase_installment_totals['overdue'] or 0),
            'paid': str(purchase_installment_totals['paid'] or 0),
        },
        'top_creditors': [
            {
                'id': s.id, 'name': s.name,
                'debt': str(s.debt), 'overdue_count': s.overdue_count,
            } for s in top_creditors
        ],
        'orders': {
            'total': total_orders,
            'converted': converted_orders,
            'conversion_rate': round(conversion_rate, 1),
            'by_status': orders_by_status,
        },
        'expenses_by_category': [
            {
                'category': row['category'],
                'category_display': dict(Expense.CATEGORY_CHOICES).get(row['category'], row['category']),
                'total': str(row['total']), 'count': row['count'],
            } for row in expenses_by_category
        ],
    })


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        action_param = self.request.query_params.get('action')
        if action_param:
            qs = qs.filter(action=action_param)

        model_name = self.request.query_params.get('model_name')
        if model_name:
            qs = qs.filter(model_name=model_name)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return qs

    @action(detail=False, methods=['get'])
    def users(self, request):
        users = (
            AuditLog.objects.exclude(user__isnull=True)
            .values('user_id', 'user__username')
            .distinct()
            .order_by('user__username')
        )
        return Response([{'id': u['user_id'], 'username': u['user__username']} for u in users])
