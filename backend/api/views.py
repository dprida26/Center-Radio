from rest_framework import viewsets, filters, permissions
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone
from django.db.models import Q, Sum, Count, F, Min, Max
from django.db.models.functions import TruncMonth, TruncDay, TruncWeek
from datetime import date, timedelta
from decimal import Decimal
from .models import (
    Category, Product, ProductImage, Promotion, CompanyInfo, Customer, Sale, SaleItem, Installment, InstallmentPayment, Order, Expense, AuditLog,
    Supplier, PurchaseInvoice, PurchaseInvoiceItem, PurchaseInstallment, CreditNote,
)
from .serializers import (
    CategorySerializer, ProductSerializer, PromotionSerializer, CompanyInfoSerializer,
    CustomerSerializer, SaleSerializer, InstallmentSerializer, OrderSerializer, ProductImageSerializer,
    ExpenseSerializer, StockMovementSerializer, AuditLogSerializer,
    SupplierSerializer, PurchaseInvoiceSerializer, PurchaseInstallmentSerializer, CreditNoteSerializer,
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
        if self.request.query_params.get('include_inactive') or self.action in (
            'retrieve', 'update', 'partial_update', 'destroy',
            'images', 'delete_image', 'add_stock',
        ):
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

    def _stock_data(self):
        from .reports_export import to_number
        products = Product.objects.filter(is_active=True).select_related(
            'category', 'usual_supplier'
        ).order_by('category__name', 'name')
        return [
            {
                'product_id': p.id,
                'name': p.name, 'brand': p.brand, 'model': p.model,
                'category_name': p.category.name if p.category else '',
                'supplier_name': p.usual_supplier.name if p.usual_supplier else '',
                'stock': p.stock, 'min_stock': p.min_stock,
                'cost_price': to_number(p.cost_price), 'price': to_number(p.price),
            }
            for p in products
        ]

    @action(detail=False, methods=['get'], url_path='stock_preview')
    def stock_preview(self, request):
        return Response(self._stock_data())

    @action(detail=False, methods=['get'])
    def export_stock(self, request):
        from .reports_export import build_xlsx_response

        columns = [
            {'header': 'Producto', 'width': 36},
            {'header': 'Marca', 'width': 16},
            {'header': 'Modelo', 'width': 16},
            {'header': 'Categoría', 'width': 20},
            {'header': 'Proveedor habitual', 'width': 24},
            {'header': 'Stock', 'width': 10, 'format': 'number'},
            {'header': 'Stock mínimo', 'width': 12, 'format': 'number'},
            {'header': 'Precio de costo', 'width': 16, 'format': 'gs'},
            {'header': 'Precio de venta', 'width': 16, 'format': 'gs'},
        ]
        data = self._stock_data()
        rows = [
            (r['name'], r['brand'], r['model'], r['category_name'], r['supplier_name'],
             r['stock'], r['min_stock'], r['cost_price'], r['price'])
            for r in data
        ]
        low_stock_count = sum(1 for r in data if r['stock'] <= r['min_stock'])
        return build_xlsx_response(
            'stock_productos.xlsx', 'Stock', columns, rows,
            report_title='Reporte de Stock y Precios',
            extra_meta=[f'Productos con stock bajo el mínimo: {low_stock_count}'],
        )

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
        sales = customer.sales.all().prefetch_related('installments', 'installments__payments').order_by('-sale_date')
        serializer = SaleSerializer(sales, many=True)
        return Response(serializer.data)

    def _clientes_data(self):
        from .reports_export import to_number

        customers = Customer.objects.all().order_by('full_name')

        purchased_by_customer = dict(
            SaleItem.objects.values('sale__customer_id')
            .annotate(total=Sum(F('unit_price') * F('quantity')))
            .values_list('sale__customer_id', 'total')
        )
        sales_count_by_customer = dict(
            Sale.objects.values('customer_id').annotate(count=Count('id')).values_list('customer_id', 'count')
        )
        last_sale_by_customer = dict(
            Sale.objects.values('customer_id').annotate(last_date=Max('sale_date')).values_list('customer_id', 'last_date')
        )

        # El saldo pendiente usa remaining_amount real (descuenta abonos
        # parciales via payments), no el monto bruto de la cuota. Mismo
        # patrón que _proveedores_data y _mora_data.
        pending_installments = Installment.objects.filter(
            status__in=[Installment.STATUS_PENDING, Installment.STATUS_OVERDUE],
        ).select_related('sale').prefetch_related('payments')

        pending_by_customer = {}
        for inst in pending_installments:
            customer_id = inst.sale.customer_id
            pending_by_customer[customer_id] = pending_by_customer.get(customer_id, Decimal('0')) + inst.remaining_amount

        return [
            {
                'customer_id': c.id,
                'full_name': c.full_name,
                'document_number': c.document_number,
                'phone': c.phone or '',
                'email': c.email or '',
                'address': c.address or '',
                'total_purchased': to_number(purchased_by_customer.get(c.id) or 0),
                'purchase_count': sales_count_by_customer.get(c.id, 0),
                'pending_amount': to_number(pending_by_customer.get(c.id, Decimal('0'))),
                'last_sale_date': (
                    last_sale_by_customer[c.id].strftime('%d/%m/%Y')
                    if last_sale_by_customer.get(c.id) else ''
                ),
            }
            for c in customers
        ]

    @action(detail=False, methods=['get'], url_path='clientes_preview')
    def clientes_preview(self, request):
        return Response(self._clientes_data())

    @action(detail=False, methods=['get'], url_path='export_clientes')
    def export_clientes(self, request):
        from .reports_export import build_xlsx_response
        data = self._clientes_data()
        columns = [
            {'header': 'Cliente', 'width': 30},
            {'header': 'CI/RUC', 'width': 14},
            {'header': 'Teléfono', 'width': 16},
            {'header': 'Correo', 'width': 24},
            {'header': 'Dirección', 'width': 30},
            {'header': 'Total comprado', 'width': 18, 'format': 'gs'},
            {'header': 'Cantidad de compras', 'width': 16, 'format': 'number'},
            {'header': 'Saldo pendiente', 'width': 18, 'format': 'gs'},
            {'header': 'Última compra', 'width': 16},
        ]
        rows = [
            (r['full_name'], r['document_number'], r['phone'], r['email'], r['address'],
             r['total_purchased'], r['purchase_count'], r['pending_amount'], r['last_sale_date'])
            for r in data
        ]
        return build_xlsx_response(
            'listado_clientes.xlsx', 'Clientes', columns, rows,
            report_title='Listado de Clientes',
        )

    def _mora_data(self, due_from=None, due_to=None):
        from .reports_export import to_number
        today = timezone.now().date()
        overdue_q = (
            Q(status=Installment.STATUS_OVERDUE) |
            Q(status=Installment.STATUS_PENDING, due_date__lt=today)
        )
        if due_from:
            overdue_q &= Q(due_date__gte=due_from)
        if due_to:
            overdue_q &= Q(due_date__lte=due_to)

        # El monto atrasado se calcula con remaining_amount real (descuenta
        # abonos parciales via payments), no el monto bruto de la cuota:
        # Sum('amount') sobreestima la mora cuando el cliente ya abonó
        # parte de una cuota que sigue vencida. Mismo patrón que
        # _proveedores_data.
        overdue_installments = Installment.objects.filter(overdue_q).select_related(
            'sale', 'sale__customer'
        ).prefetch_related('payments')

        by_customer = {}
        for inst in overdue_installments:
            customer = inst.sale.customer
            entry = by_customer.setdefault(customer.id, {
                'customer_id': customer.id,
                'full_name': customer.full_name,
                'document_number': customer.document_number,
                'phone': customer.phone or '',
                'overdue_count': 0,
                'overdue_amount': Decimal('0'),
                'oldest_due_date': inst.due_date,
            })
            entry['overdue_count'] += 1
            entry['overdue_amount'] += inst.remaining_amount
            if inst.due_date < entry['oldest_due_date']:
                entry['oldest_due_date'] = inst.due_date

        result = [
            {
                'customer_id': e['customer_id'],
                'full_name': e['full_name'],
                'document_number': e['document_number'],
                'phone': e['phone'],
                'overdue_count': e['overdue_count'],
                'overdue_amount': to_number(e['overdue_amount']),
                'days_overdue': (today - e['oldest_due_date']).days,
            }
            for e in by_customer.values()
        ]
        result.sort(key=lambda r: r['overdue_amount'], reverse=True)
        return result

    @action(detail=False, methods=['get'], url_path='mora_preview')
    def mora_preview(self, request):
        due_from = request.query_params.get('due_from') or None
        due_to = request.query_params.get('due_to') or None
        return Response(self._mora_data(due_from, due_to))

    @action(detail=False, methods=['get'], url_path='export_mora')
    def export_mora(self, request):
        from .reports_export import build_xlsx_response

        due_from = request.query_params.get('due_from') or None
        due_to = request.query_params.get('due_to') or None

        columns = [
            {'header': 'Cliente', 'width': 32},
            {'header': 'CI/RUC', 'width': 16},
            {'header': 'Teléfono', 'width': 16},
            {'header': 'Cuotas atrasadas', 'width': 16, 'format': 'number'},
            {'header': 'Monto atrasado', 'width': 18, 'format': 'gs'},
            {'header': 'Días de atraso (más antigua)', 'width': 22, 'format': 'number'},
        ]
        rows = [
            (r['full_name'], r['document_number'], r['phone'], r['overdue_count'], r['overdue_amount'], r['days_overdue'])
            for r in self._mora_data(due_from, due_to)
        ]
        extra_meta = []
        if due_from or due_to:
            extra_meta.append(f'Vencimiento: {due_from or "inicio"} a {due_to or "hoy"}')
        return build_xlsx_response(
            'clientes_con_mora.xlsx', 'Clientes con mora', columns, rows,
            report_title='Reporte de Clientes con Mora',
            extra_meta=extra_meta,
        )


class SupplierViewSet(AuditMixin, viewsets.ModelViewSet):
    audit_fields = ['name', 'contact_name', 'phone', 'email', 'address', 'ruc', 'is_active']
    queryset = Supplier.objects.all().order_by('name')
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'contact_name', 'phone', 'email', 'ruc']

    @action(detail=True, methods=['get'])
    def purchases(self, request, pk=None):
        supplier = self.get_object()
        invoices = supplier.purchase_invoices.all().prefetch_related(
            'items', 'items__product', 'purchase_installments', 'purchase_installments__payments',
            'credit_notes', 'credit_notes__items', 'credit_notes__items__product',
            'credit_note_allocations', 'credit_note_allocations__items', 'credit_note_allocations__items__product',
            'credit_note_allocations__invoice_allocations',
        ).order_by('-purchase_date')
        serializer = PurchaseInvoiceSerializer(invoices, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        supplier = self.get_object()
        products = supplier.usual_products.filter(is_active=True)
        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    def _proveedores_range(self, request):
        today = timezone.now().date()
        date_from = request.query_params.get('date_from') or today.replace(day=1).isoformat()
        date_to = request.query_params.get('date_to') or today.isoformat()
        return date_from, date_to

    def _proveedores_data(self, date_from, date_to):
        from .reports_export import to_number
        today = timezone.now().date()

        invoices_in_range = PurchaseInvoice.objects.filter(
            purchase_date__gte=date_from, purchase_date__lte=date_to,
        )
        supplier_ids_in_range = invoices_in_range.values_list('supplier_id', flat=True).distinct()
        suppliers = Supplier.objects.filter(id__in=supplier_ids_in_range)

        purchased_by_supplier = dict(
            PurchaseInvoiceItem.objects.filter(purchase_invoice__in=invoices_in_range)
            .values('purchase_invoice__supplier_id')
            .annotate(total=Sum(F('unit_cost') * F('quantity')))
            .values_list('purchase_invoice__supplier_id', 'total')
        )
        last_purchase_by_supplier = dict(
            invoices_in_range.values('supplier_id')
            .annotate(last_date=Max('purchase_date'))
            .values_list('supplier_id', 'last_date')
        )

        # El saldo pendiente y las cuotas atrasadas se calculan con
        # remaining_amount real (descuenta abonos parciales via payments),
        # no el monto bruto de la cuota, y solo de las compras del rango
        # seleccionado (no la deuda de otras compras fuera del período).
        pending_installments = PurchaseInstallment.objects.filter(
            status__in=[PurchaseInstallment.STATUS_PENDING, PurchaseInstallment.STATUS_OVERDUE],
            purchase_invoice__in=invoices_in_range,
        ).select_related('purchase_invoice').prefetch_related('payments')

        pending_by_supplier = {}
        overdue_count_by_supplier = {}
        for inst in pending_installments:
            supplier_id = inst.purchase_invoice.supplier_id
            pending_by_supplier[supplier_id] = pending_by_supplier.get(supplier_id, Decimal('0')) + inst.remaining_amount
            is_overdue = inst.status == PurchaseInstallment.STATUS_OVERDUE or (
                inst.status == PurchaseInstallment.STATUS_PENDING and inst.due_date < today
            )
            if is_overdue:
                overdue_count_by_supplier[supplier_id] = overdue_count_by_supplier.get(supplier_id, 0) + 1

        result = []
        for s in suppliers:
            result.append({
                'supplier_id': s.id,
                'name': s.name,
                'phone': s.phone or '',
                'ruc': s.ruc or '',
                'total_purchased': to_number(purchased_by_supplier.get(s.id) or 0),
                'pending_amount': to_number(pending_by_supplier.get(s.id, Decimal('0'))),
                'overdue_count': overdue_count_by_supplier.get(s.id, 0),
                'last_purchase_date': (
                    last_purchase_by_supplier[s.id].strftime('%d/%m/%Y')
                    if last_purchase_by_supplier.get(s.id) else ''
                ),
            })
        result.sort(key=lambda r: r['total_purchased'], reverse=True)
        return result

    @action(detail=False, methods=['get'], url_path='deuda_preview')
    def deuda_preview(self, request):
        date_from, date_to = self._proveedores_range(request)
        return Response({'date_from': date_from, 'date_to': date_to, 'results': self._proveedores_data(date_from, date_to)})

    @action(detail=False, methods=['get'], url_path='export_deuda')
    def export_deuda(self, request):
        from .reports_export import build_xlsx_response
        date_from, date_to = self._proveedores_range(request)
        data = self._proveedores_data(date_from, date_to)
        columns = [
            {'header': 'Proveedor', 'width': 30},
            {'header': 'RUC', 'width': 14},
            {'header': 'Teléfono', 'width': 16},
            {'header': 'Comprado en el período', 'width': 20, 'format': 'gs'},
            {'header': 'Saldo pendiente', 'width': 18, 'format': 'gs'},
            {'header': 'Cuotas atrasadas', 'width': 16, 'format': 'number'},
            {'header': 'Última compra', 'width': 16},
        ]
        rows = [
            (r['name'], r['ruc'], r['phone'], r['total_purchased'], r['pending_amount'], r['overdue_count'], r['last_purchase_date'])
            for r in data
        ]
        return build_xlsx_response(
            'proveedores_con_deuda.xlsx', 'Proveedores', columns, rows,
            report_title='Reporte de Proveedores',
            extra_meta=[f'Período: {date_from} a {date_to}'],
        )


class SaleViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = Sale.objects.all().select_related('customer').prefetch_related(
        'items', 'items__product', 'installments', 'installments__payments'
    ).order_by('-sale_date', '-created_at')
    serializer_class = SaleSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['customer__full_name', 'customer__document_number', 'items__product__name']

    def perform_create(self, serializer):
        custom_amount = self.request.data.get('custom_installment_amount')
        sale = serializer.save()
        for item in sale.items.select_related('product').all():
            item.product.register_sale_exit(item.quantity, reason=f'Venta #{sale.id}')
        sale.generate_installments(custom_installment_amount=custom_amount or None)
        log_action(self.request.user, AuditLog.ACTION_CREATE, sale)

    # Datos básicos: siempre editables, sin importar si ya hay pagos.
    BASIC_EDITABLE_FIELDS = {'customer', 'sale_date', 'notes'}
    # Detalle de productos y condiciones de cuotas: solo editables mientras
    # la venta no tenga ningún pago registrado, porque cambiarlos implica
    # revertir/aplicar stock y regenerar las cuotas desde cero (se perdería
    # cualquier abono ya hecho sobre las cuotas viejas).
    RESTRICTED_EDITABLE_FIELDS = {
        'items', 'payment_type', 'installment_count', 'interest_rate',
        'down_payment', 'payment_day', 'first_due_date', 'late_fee_rate',
    }
    EDITABLE_FIELDS = BASIC_EDITABLE_FIELDS | RESTRICTED_EDITABLE_FIELDS

    def _has_any_payment(self, sale):
        return any(inst.paid_so_far > 0 for inst in sale.installments.all())

    def update(self, request, *args, **kwargs):
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'reason': 'Debés indicar el motivo de la edición.'}, status=400)

        payload = {k: v for k, v in request.data.items() if k in self.EDITABLE_FIELDS}
        custom_amount = request.data.get('custom_installment_amount')

        sale = self.get_object()
        touches_restricted = any(field in payload for field in self.RESTRICTED_EDITABLE_FIELDS) or custom_amount
        if touches_restricted and self._has_any_payment(sale):
            return Response(
                {'error': 'No se pueden editar los productos ni las condiciones de cuotas de esta venta porque ya tiene pagos registrados. Usá una nota de crédito para corregirla.'},
                status=400,
            )

        old_items = list(sale.items.select_related('product').all()) if 'items' in payload else []
        serializer = self.get_serializer(sale, data=payload, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if touches_restricted:
            sale.refresh_from_db()
            if 'items' in payload:
                for old_item in old_items:
                    old_item.product.adjust_stock(
                        old_item.quantity, reason=f'Reversión por edición de venta #{sale.id}',
                    )
                for new_item in sale.items.select_related('product').all():
                    new_item.product.register_sale_exit(new_item.quantity, reason=f'Edición de venta #{sale.id}')
            sale.generate_installments(custom_installment_amount=custom_amount or None)

        log_action(
            request.user, AuditLog.ACTION_UPDATE, sale,
            description=f'Editó la venta #{sale.id}. Motivo: {reason}',
        )
        return Response(self.get_serializer(sale).data)

    def destroy(self, request, *args, **kwargs):
        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'reason': 'Debés indicar el motivo de la eliminación.'}, status=400)

        sale = self.get_object()
        if self._has_any_payment(sale):
            return Response(
                {'error': 'No se puede eliminar esta venta porque ya tiene pagos registrados. Usá una nota de crédito para corregirla.'},
                status=400,
            )

        for item in sale.items.select_related('product').all():
            item.product.adjust_stock(item.quantity, reason=f'Reversión por eliminación de venta #{sale.id}')

        log_action(
            request.user, AuditLog.ACTION_DELETE, sale,
            description=f'Eliminó la venta #{sale.id} ({sale}). Motivo: {reason}',
        )
        sale.delete()
        return Response(status=204)

    def _ventas_range(self, request):
        today = timezone.now().date()
        date_from = request.query_params.get('date_from') or today.replace(day=1).isoformat()
        date_to = request.query_params.get('date_to') or today.isoformat()
        return date_from, date_to

    def _ventas_data(self, date_from, date_to):
        from .reports_export import to_number
        payment_labels = {Sale.PAYMENT_CASH: 'Contado', Sale.PAYMENT_INSTALLMENTS: 'Cuotas'}
        sales = Sale.objects.filter(
            sale_date__gte=date_from, sale_date__lte=date_to
        ).select_related('customer').prefetch_related('items', 'items__product').order_by('-sale_date', '-created_at')
        data = []
        for sale in sales:
            items = list(sale.items.all())
            product_name = ', '.join(i.product.name for i in items[:2]) + (f' +{len(items)-2}' if len(items) > 2 else '')
            data.append({
                'sale_id': sale.id,
                'sale_date': sale.sale_date.strftime('%d/%m/%Y'),
                'customer_id': sale.customer_id,
                'customer_name': sale.customer.full_name,
                'document_number': sale.customer.document_number,
                'product_name': product_name,
                'payment_type': sale.payment_type,
                'payment_type_label': payment_labels.get(sale.payment_type, sale.payment_type),
                'total_amount': to_number(sale.total_amount),
            })
        return data

    @action(detail=False, methods=['get'], url_path='ventas_preview')
    def ventas_preview(self, request):
        date_from, date_to = self._ventas_range(request)
        return Response({'date_from': date_from, 'date_to': date_to, 'results': self._ventas_data(date_from, date_to)})

    @action(detail=False, methods=['get'], url_path='export_ventas')
    def export_ventas(self, request):
        from .reports_export import build_xlsx_response
        date_from, date_to = self._ventas_range(request)
        data = self._ventas_data(date_from, date_to)
        columns = [
            {'header': 'Fecha', 'width': 12},
            {'header': 'Cliente', 'width': 28},
            {'header': 'CI/RUC', 'width': 14},
            {'header': 'Producto(s)', 'width': 30},
            {'header': 'Tipo de pago', 'width': 12},
            {'header': 'Total', 'width': 16, 'format': 'gs'},
        ]
        rows = [
            (r['sale_date'], r['customer_name'], r['document_number'], r['product_name'], r['payment_type_label'], r['total_amount'])
            for r in data
        ]
        return build_xlsx_response(
            'ventas_por_periodo.xlsx', 'Ventas', columns, rows,
            report_title='Reporte de Ventas por Período',
            extra_meta=[f'Período: {date_from} a {date_to}'],
        )

    def _top_productos_data(self, date_from, date_to):
        from .reports_export import to_number
        rows = list(
            SaleItem.objects.filter(sale__sale_date__gte=date_from, sale__sale_date__lte=date_to)
            .values('product_id', 'product__name')
            .annotate(units=Sum('quantity'), total=Sum(F('unit_price') * F('quantity')))
            .order_by('-units')
        )
        return [
            {'product_id': r['product_id'], 'name': r['product__name'], 'units': r['units'], 'total': to_number(r['total'])}
            for r in rows
        ]

    @action(detail=False, methods=['get'], url_path='top_productos_preview')
    def top_productos_preview(self, request):
        date_from, date_to = self._ventas_range(request)
        return Response({'date_from': date_from, 'date_to': date_to, 'results': self._top_productos_data(date_from, date_to)})

    @action(detail=False, methods=['get'], url_path='export_top_productos')
    def export_top_productos(self, request):
        from .reports_export import build_xlsx_response
        date_from, date_to = self._ventas_range(request)
        data = self._top_productos_data(date_from, date_to)
        columns = [
            {'header': 'Producto', 'width': 32},
            {'header': 'Unidades vendidas', 'width': 16, 'format': 'number'},
            {'header': 'Total vendido', 'width': 16, 'format': 'gs'},
        ]
        rows = [(r['name'], r['units'], r['total']) for r in data]
        return build_xlsx_response(
            'productos_mas_vendidos.xlsx', 'Productos más vendidos', columns, rows,
            report_title='Reporte de Productos Más Vendidos',
            extra_meta=[f'Período: {date_from} a {date_to}'],
        )

    def _resumen_data(self, date_from, date_to):
        from .reports_export import to_number
        sales_qs = Sale.objects.filter(sale_date__gte=date_from, sale_date__lte=date_to)
        item_summary = SaleItem.objects.filter(sale__in=sales_qs).aggregate(
            total_revenue=Sum(F('unit_price') * F('quantity')),
            total_units=Sum('quantity'),
        )
        total_revenue = item_summary['total_revenue'] or 0
        total_sales = sales_qs.count()
        avg_ticket = (total_revenue / total_sales) if total_sales else 0

        pending_credit = Decimal('0')
        for sale in sales_qs.filter(payment_type=Sale.PAYMENT_INSTALLMENTS).prefetch_related('installments'):
            pending_credit += sale.remaining_amount
        received_amount = total_revenue - pending_credit

        return {
            'total_revenue': to_number(total_revenue),
            'received_amount': to_number(received_amount),
            'pending_credit': to_number(pending_credit),
            'total_sales': total_sales,
            'total_units': item_summary['total_units'] or 0,
            'avg_ticket': to_number(round(avg_ticket, 2)) if total_sales else 0,
        }

    @action(detail=False, methods=['get'], url_path='resumen_preview')
    def resumen_preview(self, request):
        date_from, date_to = self._ventas_range(request)
        return Response({'date_from': date_from, 'date_to': date_to, **self._resumen_data(date_from, date_to)})

    @action(detail=False, methods=['get'], url_path='export_resumen')
    def export_resumen(self, request):
        from .reports_export import build_xlsx_response
        date_from, date_to = self._ventas_range(request)
        r = self._resumen_data(date_from, date_to)
        columns = [
            {'header': 'Indicador', 'width': 24},
            {'header': 'Valor', 'width': 18},
        ]
        rows = [
            ('Ingresos totales', r['total_revenue']),
            ('Monto ya recibido', r['received_amount']),
            ('Créditos pendientes de cobro', r['pending_credit']),
            ('Cantidad de ventas', r['total_sales']),
            ('Unidades vendidas', r['total_units']),
            ('Promedio por venta', r['avg_ticket']),
        ]
        return build_xlsx_response(
            'resumen_ventas.xlsx', 'Resumen', columns, rows,
            report_title='Resumen de Ventas',
            extra_meta=[f'Período: {date_from} a {date_to}'],
        )


class PurchaseInvoiceViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = PurchaseInvoice.objects.all().select_related('supplier').prefetch_related(
        'items', 'items__product', 'purchase_installments', 'purchase_installments__payments',
        'credit_notes', 'credit_notes__items', 'credit_notes__items__product',
        'credit_note_allocations', 'credit_note_allocations__items', 'credit_note_allocations__items__product',
        'credit_note_allocations__invoice_allocations',
    ).order_by('-purchase_date', '-created_at')
    serializer_class = PurchaseInvoiceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['supplier__name', 'invoice_number']

    def get_queryset(self):
        qs = super().get_queryset()
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        return qs

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


class CreditNoteViewSet(AuditMixin, viewsets.ModelViewSet):
    queryset = CreditNote.objects.all().select_related('purchase_invoice__supplier', 'supplier').prefetch_related(
        'items', 'items__product', 'invoice_allocations', 'invoice_allocations__purchase_invoice',
    ).order_by('-issue_date', '-created_at')
    serializer_class = CreditNoteSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['purchase_invoice__supplier__name', 'purchase_invoice__invoice_number', 'credit_note_number']

    def perform_create(self, serializer):
        credit_note = serializer.save()
        credit_note.apply()
        log_action(self.request.user, AuditLog.ACTION_CREATE, credit_note)


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
    queryset = Installment.objects.all().select_related('sale', 'sale__customer').prefetch_related(
        'payments', 'sale__items', 'sale__items__product'
    )
    serializer_class = InstallmentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['sale__customer__full_name', 'sale__customer__document_number']

    def get_queryset(self):
        qs = super().get_queryset()
        today = timezone.now().date()
        # No hacemos UPDATE masivo sobre toda la tabla en cada request (eso
        # era un Seq Scan + escritura en cada GET, insostenible con miles de
        # cuotas y varios usuarios concurrentes). El estado "vencida" se
        # calcula al vuelo combinando el status persistido con is_overdue;
        # el status en la base se sincroniza aparte, ver sync_overdue_installments.
        is_overdue_q = Q(status=Installment.STATUS_PENDING, due_date__lt=today)

        status_param = self.request.query_params.get('status')
        if status_param == Installment.STATUS_OVERDUE:
            qs = qs.filter(Q(status=Installment.STATUS_OVERDUE) | is_overdue_q)
        elif status_param == Installment.STATUS_PENDING:
            qs = qs.filter(status=Installment.STATUS_PENDING).exclude(is_overdue_q)
        elif status_param:
            qs = qs.filter(status=status_param)

        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            qs = qs.filter(sale__customer_id=customer_id)

        due_before = self.request.query_params.get('due_before')
        if due_before:
            qs = qs.filter(due_date__lte=due_before)

        due_from = self.request.query_params.get('due_from')
        if due_from:
            qs = qs.filter(due_date__gte=due_from)
        due_to = self.request.query_params.get('due_to')
        if due_to:
            qs = qs.filter(due_date__lte=due_to)

        return qs.order_by('due_date')

    def _por_cobrar_range(self, request):
        from dateutil.relativedelta import relativedelta
        today = timezone.now().date()
        due_from = request.query_params.get('due_from') or today.replace(day=1).isoformat()
        due_to = request.query_params.get('due_to') or (
            today.replace(day=1) + relativedelta(months=1, days=-1)
        ).isoformat()
        return due_from, due_to

    def _por_cobrar_data(self, due_from, due_to):
        from .reports_export import to_number
        today = timezone.now().date()
        qs = self.get_queryset().filter(due_date__gte=due_from, due_date__lte=due_to).exclude(
            status=Installment.STATUS_PAID
        )
        status_labels = {'PENDING': 'Pendiente', 'OVERDUE': 'Atrasada'}
        data = []
        for inst in qs:
            items = list(inst.sale.items.all())
            product_name = ', '.join(i.product.name for i in items[:2]) + (f' +{len(items)-2}' if len(items) > 2 else '')
            real_status = 'OVERDUE' if (inst.status == Installment.STATUS_PENDING and inst.due_date < today) else inst.status
            data.append({
                'customer_id': inst.sale.customer_id,
                'customer_name': inst.sale.customer.full_name,
                'document_number': inst.sale.customer.document_number,
                'phone': inst.sale.customer.phone or '',
                'product_name': product_name,
                'installment_label': f'{inst.number}/{inst.sale.installment_count}',
                'due_date': inst.due_date.strftime('%d/%m/%Y'),
                'amount': to_number(inst.amount),
                'status': real_status,
                'status_label': status_labels.get(real_status, real_status),
            })
        return data

    @action(detail=False, methods=['get'], url_path='por_cobrar_preview')
    def por_cobrar_preview(self, request):
        due_from, due_to = self._por_cobrar_range(request)
        return Response({'due_from': due_from, 'due_to': due_to, 'results': self._por_cobrar_data(due_from, due_to)})

    @action(detail=False, methods=['get'], url_path='export_por_cobrar')
    def export_por_cobrar(self, request):
        from .reports_export import build_xlsx_response
        due_from, due_to = self._por_cobrar_range(request)
        data = self._por_cobrar_data(due_from, due_to)

        columns = [
            {'header': 'Cliente', 'width': 32},
            {'header': 'CI/RUC', 'width': 16},
            {'header': 'Teléfono', 'width': 16},
            {'header': 'Producto', 'width': 30},
            {'header': 'Cuota', 'width': 10},
            {'header': 'Vencimiento', 'width': 14},
            {'header': 'Monto', 'width': 16, 'format': 'gs'},
            {'header': 'Estado', 'width': 14},
        ]
        rows = [
            (r['customer_name'], r['document_number'], r['phone'], r['product_name'],
             r['installment_label'], r['due_date'], r['amount'], r['status_label'])
            for r in data
        ]

        return build_xlsx_response(
            'cuotas_por_cobrar.xlsx', 'Cuotas por cobrar', columns, rows,
            report_title='Reporte de Cuotas por Cobrar',
            extra_meta=[f'Período: {due_from} a {due_to}'],
        )

    def _cobrado_range(self, request):
        today = timezone.now().date()
        date_from = request.query_params.get('date_from') or today.isoformat()
        date_to = request.query_params.get('date_to') or today.isoformat()
        return date_from, date_to

    def _cobrado_data(self, date_from, date_to):
        from .reports_export import to_number

        data = []

        cash_sales = Sale.objects.filter(
            payment_type=Sale.PAYMENT_CASH, sale_date__gte=date_from, sale_date__lte=date_to
        ).select_related('customer').prefetch_related('items')
        for sale in cash_sales:
            data.append({
                'date': sale.sale_date.strftime('%d/%m/%Y'),
                'sort_date': sale.sale_date.isoformat(),
                'customer_id': sale.customer_id,
                'customer_name': sale.customer.full_name,
                'document_number': sale.customer.document_number,
                'concept': 'Venta al contado',
                'amount': to_number(sale.total_amount),
            })

        down_payment_sales = Sale.objects.filter(
            payment_type=Sale.PAYMENT_INSTALLMENTS, down_payment__gt=0,
            sale_date__gte=date_from, sale_date__lte=date_to,
        ).select_related('customer')
        for sale in down_payment_sales:
            data.append({
                'date': sale.sale_date.strftime('%d/%m/%Y'),
                'sort_date': sale.sale_date.isoformat(),
                'customer_id': sale.customer_id,
                'customer_name': sale.customer.full_name,
                'document_number': sale.customer.document_number,
                'concept': 'Entrega inicial',
                'amount': to_number(sale.down_payment),
            })

        payments = InstallmentPayment.objects.filter(
            payment_date__gte=date_from, payment_date__lte=date_to
        ).select_related('installment__sale__customer')
        for p in payments:
            sale = p.installment.sale
            concept = (
                f'Mora cuota {p.installment.number}/{sale.installment_count}' if p.is_late_fee
                else f'Abono cuota {p.installment.number}/{sale.installment_count}'
            )
            data.append({
                'date': p.payment_date.strftime('%d/%m/%Y'),
                'sort_date': p.payment_date.isoformat(),
                'customer_id': sale.customer_id,
                'customer_name': sale.customer.full_name,
                'document_number': sale.customer.document_number,
                'concept': concept,
                'amount': to_number(p.amount),
            })

        # Cuotas marcadas como pagadas sin un InstallmentPayment individual:
        # datos de la migración de cuotas legado, donde solo se conserva la
        # fecha en que se registró el pago (paid_date), no el detalle de
        # abonos parciales. Se incluyen para no perder ese historial de cobro.
        legacy_paid = Installment.objects.filter(
            status=Installment.STATUS_PAID, payments__isnull=True,
            paid_date__gte=date_from, paid_date__lte=date_to,
        ).select_related('sale__customer')
        for inst in legacy_paid:
            sale = inst.sale
            data.append({
                'date': inst.paid_date.strftime('%d/%m/%Y'),
                'sort_date': inst.paid_date.isoformat(),
                'customer_id': sale.customer_id,
                'customer_name': sale.customer.full_name,
                'document_number': sale.customer.document_number,
                'concept': f'Cuota {inst.number}/{sale.installment_count} (dato migrado)',
                'amount': to_number(inst.amount),
            })

        data.sort(key=lambda r: r['sort_date'])
        for r in data:
            del r['sort_date']
        return data

    @action(detail=False, methods=['get'], url_path='cobrado_preview')
    def cobrado_preview(self, request):
        date_from, date_to = self._cobrado_range(request)
        results = self._cobrado_data(date_from, date_to)
        total = sum(Decimal(str(r['amount'])) for r in results)
        return Response({
            'date_from': date_from, 'date_to': date_to,
            'total': str(total), 'results': results,
        })

    @action(detail=False, methods=['get'], url_path='export_cobrado')
    def export_cobrado(self, request):
        from .reports_export import build_xlsx_response
        date_from, date_to = self._cobrado_range(request)
        data = self._cobrado_data(date_from, date_to)

        columns = [
            {'header': 'Fecha', 'width': 14},
            {'header': 'Cliente', 'width': 32},
            {'header': 'CI/RUC', 'width': 16},
            {'header': 'Concepto', 'width': 26},
            {'header': 'Monto cobrado', 'width': 16, 'format': 'gs'},
        ]
        rows = [
            (r['date'], r['customer_name'], r['document_number'], r['concept'], r['amount'])
            for r in data
        ]

        return build_xlsx_response(
            'cobrado_periodo.xlsx', 'Cobrado', columns, rows,
            report_title='Reporte de Lo Cobrado en el Período',
            extra_meta=[f'Período: {date_from} a {date_to}'],
        )

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

        raw_amount = request.data.get('paid_amount')
        amount = Decimal(str(raw_amount)) if raw_amount not in (None, '') else installment.remaining_amount or installment.amount
        payment_date = request.data.get('payment_date') or None
        raw_late_fee = request.data.get('late_fee_amount')
        late_fee_amount = Decimal(str(raw_late_fee)) if raw_late_fee not in (None, '') else None

        try:
            affected, sobrante = installment.register_payment(
                amount=amount, payment_date=payment_date, created_by=request.user,
                late_fee_amount=late_fee_amount,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

        installment.refresh_from_db()
        if len(affected) > 1:
            desc = f'Registró un abono de Gs. {amount} en la cuota {installment.number}, con excedente aplicado a {len(affected) - 1} cuota(s) siguiente(s).'
        elif installment.status == Installment.STATUS_PAID:
            desc = f'Marcó como pagada la cuota {installment.number} (Gs. {amount}).'
        else:
            desc = f'Registró un abono parcial de Gs. {amount} en la cuota {installment.number} (saldo restante: Gs. {installment.remaining_amount}).'
        log_action(request.user, AuditLog.ACTION_CUSTOM, installment, description=desc)

        serializer = self.get_serializer(installment)
        other_sale_installments = [a for a in affected[1:] if a.sale_id != installment.sale_id]
        crossed_to_other_sale = other_sale_installments[0].sale_id if other_sale_installments else None
        crossed_amount = (
            sum((a.paid_so_far for a in other_sale_installments), Decimal('0'))
            if other_sale_installments else None
        )
        return Response({
            **serializer.data,
            'affected_installments': [a.id for a in affected],
            'overpaid_unapplied': str(sobrante) if sobrante > 0 else None,
            'crossed_amount': str(crossed_amount) if crossed_amount is not None else None,
            'crossed_to_other_sale': crossed_to_other_sale,
        })

    @action(detail=True, methods=['post'])
    def revert_payment(self, request, pk=None):
        installment = self.get_object()
        if installment.status != Installment.STATUS_PAID and installment.paid_so_far <= 0:
            return Response({'error': 'Esta cuota no tiene pagos registrados.'}, status=400)
        was_partial = installment.status != Installment.STATUS_PAID
        installment.revert_payment()
        desc = (
            f'Deshizo el abono parcial de la cuota {installment.number}' if was_partial
            else f'Revirtió el pago de la cuota {installment.number}'
        )
        log_action(request.user, AuditLog.ACTION_CUSTOM, installment, description=desc)
        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_late_fee(self, request, pk=None):
        installment = self.get_object()

        if 'late_fee_enabled' in request.data:
            installment.late_fee_enabled = bool(request.data['late_fee_enabled'])

        if 'late_fee_override' in request.data:
            raw = request.data['late_fee_override']
            if raw in (None, ''):
                installment.late_fee_override = None
            else:
                try:
                    override = Decimal(str(raw))
                except Exception:
                    return Response({'error': 'Monto de mora inválido.'}, status=400)
                if override < 0:
                    return Response({'error': 'El monto de mora no puede ser negativo.'}, status=400)
                installment.late_fee_override = override

        installment.save(update_fields=['late_fee_enabled', 'late_fee_override'])

        desc = f'Editó el recargo por mora de la cuota {installment.number} (habilitado: {installment.late_fee_enabled}, monto: {installment.late_fee_amount}).'
        log_action(request.user, AuditLog.ACTION_CUSTOM, installment, description=desc)

        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='overdue_count')
    def overdue_count(self, request):
        today = timezone.now().date()
        is_overdue_q = Q(status=Installment.STATUS_PENDING, due_date__lt=today)
        overdue_or_marked_q = Q(status=Installment.STATUS_OVERDUE) | is_overdue_q
        count = Installment.objects.filter(overdue_or_marked_q).count()
        return Response({'count': count})

    @action(detail=False, methods=['get'])
    def due_report(self, request):
        from datetime import timedelta
        today = timezone.now().date()
        # Sin UPDATE masivo aca: status=OVERDUE se trata como "PENDING ya
        # vencida" (is_overdue_q), evitando reescribir toda la tabla en
        # cada GET. Ver nota en InstallmentViewSet.get_queryset.
        days_ahead = int(request.query_params.get('days_ahead', 7))
        qs = Installment.objects.filter(
            status__in=[Installment.STATUS_OVERDUE, Installment.STATUS_PENDING],
            due_date__lte=today + timedelta(days=days_ahead),
        ).select_related('sale', 'sale__customer').prefetch_related(
            'payments', 'sale__items', 'sale__items__product'
        ).order_by('due_date')[:30]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        from datetime import timedelta
        today = timezone.now().date()
        is_overdue_q = Q(status=Installment.STATUS_PENDING, due_date__lt=today)
        overdue_or_marked_q = Q(status=Installment.STATUS_OVERDUE) | is_overdue_q
        pending_not_overdue_q = Q(status=Installment.STATUS_PENDING, due_date__gte=today)

        totals = Installment.objects.aggregate(
            total_pending=Sum('amount', filter=pending_not_overdue_q),
            total_overdue=Sum('amount', filter=overdue_or_marked_q),
            total_paid=Sum('amount', filter=Q(status=Installment.STATUS_PAID)),
        )

        sales_by_month = list(
            SaleItem.objects.annotate(month=TruncMonth('sale__sale_date'))
            .values('month')
            .annotate(total=Sum(F('unit_price') * F('quantity')))
            .order_by('-month')[:12]
        )
        sales_count_by_month = dict(
            Sale.objects.annotate(month=TruncMonth('sale_date'))
            .values('month').annotate(count=Count('id')).values_list('month', 'count')
        )
        for row in sales_by_month:
            row['count'] = sales_count_by_month.get(row['month'], 0)

        top_debtors = Customer.objects.annotate(
            debt=Sum('sales__installments__amount', filter=Q(sales__installments__status__in=[
                Installment.STATUS_PENDING, Installment.STATUS_OVERDUE
            ])),
            overdue_count=Count('sales__installments', filter=(
                Q(sales__installments__status=Installment.STATUS_OVERDUE) |
                Q(sales__installments__status=Installment.STATUS_PENDING, sales__installments__due_date__lt=today)
            )),
        ).filter(debt__gt=0).order_by('-debt')[:10]

        DASHBOARD_LIST_LIMIT = 50

        upcoming = Installment.objects.filter(
            pending_not_overdue_q,
            due_date__lte=today + timedelta(days=7),
        ).select_related('sale', 'sale__customer').prefetch_related(
            'payments', 'sale__items', 'sale__items__product'
        ).order_by('due_date')[:DASHBOARD_LIST_LIMIT]

        overdue = Installment.objects.filter(
            overdue_or_marked_q
        ).select_related('sale', 'sale__customer').prefetch_related(
            'payments', 'sale__items', 'sale__items__product'
        ).order_by('due_date')[:DASHBOARD_LIST_LIMIT]

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
    queryset = PurchaseInstallment.objects.all().select_related('purchase_invoice', 'purchase_invoice__supplier').prefetch_related('payments')
    serializer_class = PurchaseInstallmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        today = timezone.now().date()
        # Igual que en InstallmentViewSet: sin UPDATE masivo en cada GET.
        is_overdue_q = Q(status=PurchaseInstallment.STATUS_PENDING, due_date__lt=today)

        status_param = self.request.query_params.get('status')
        if status_param == PurchaseInstallment.STATUS_OVERDUE:
            qs = qs.filter(Q(status=PurchaseInstallment.STATUS_OVERDUE) | is_overdue_q)
        elif status_param == PurchaseInstallment.STATUS_PENDING:
            qs = qs.filter(status=PurchaseInstallment.STATUS_PENDING).exclude(is_overdue_q)
        elif status_param:
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
        amount = request.data.get('paid_amount') or installment.remaining_amount
        payment_date = request.data.get('payment_date') or None
        try:
            affected, overpaid_unapplied = installment.register_payment(
                amount, payment_date=payment_date, created_by=request.user,
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

        installment.refresh_from_db()
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, installment,
            description=f'Registró un abono de Gs. {amount} en la cuota {installment.number} a proveedor',
        )
        serializer = self.get_serializer(installment)
        return Response({
            **serializer.data,
            'affected_installments': self.get_serializer(affected, many=True).data,
            'overpaid_unapplied': str(overpaid_unapplied),
        })

    @action(detail=True, methods=['post'])
    def revert_payment(self, request, pk=None):
        installment = self.get_object()
        if installment.status != PurchaseInstallment.STATUS_PAID and installment.paid_so_far <= 0:
            return Response({'error': 'Esta cuota no tiene pagos registrados.'}, status=400)
        was_partial = installment.status != PurchaseInstallment.STATUS_PAID
        installment.revert_payment()
        desc = (
            f'Deshizo el abono parcial de la cuota {installment.number} a proveedor' if was_partial
            else f'Revirtió el pago de la cuota {installment.number} a proveedor'
        )
        log_action(request.user, AuditLog.ACTION_CUSTOM, installment, description=desc)
        serializer = self.get_serializer(installment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        today = timezone.now().date()
        is_overdue_q = Q(status=PurchaseInstallment.STATUS_PENDING, due_date__lt=today)
        overdue_or_marked_q = Q(status=PurchaseInstallment.STATUS_OVERDUE) | is_overdue_q
        pending_not_overdue_q = Q(status=PurchaseInstallment.STATUS_PENDING, due_date__gte=today)

        totals = PurchaseInstallment.objects.aggregate(
            total_pending=Sum('amount', filter=pending_not_overdue_q),
            total_overdue=Sum('amount', filter=overdue_or_marked_q),
            total_paid=Sum('amount', filter=Q(status=PurchaseInstallment.STATUS_PAID)),
        )

        top_creditors = Supplier.objects.annotate(
            debt=Sum('purchase_invoices__purchase_installments__amount', filter=Q(purchase_invoices__purchase_installments__status__in=[
                PurchaseInstallment.STATUS_PENDING, PurchaseInstallment.STATUS_OVERDUE
            ])),
            overdue_count=Count('purchase_invoices__purchase_installments', filter=(
                Q(purchase_invoices__purchase_installments__status=PurchaseInstallment.STATUS_OVERDUE) |
                Q(purchase_invoices__purchase_installments__status=PurchaseInstallment.STATUS_PENDING, purchase_invoices__purchase_installments__due_date__lt=today)
            )),
        ).filter(debt__gt=0).order_by('-debt')[:10]

        upcoming = PurchaseInstallment.objects.filter(
            pending_not_overdue_q,
            due_date__lte=today + timedelta(days=7),
        ).select_related('purchase_invoice', 'purchase_invoice__supplier').order_by('due_date')

        overdue = PurchaseInstallment.objects.filter(
            overdue_or_marked_q
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

    @action(detail=False, methods=['get'])
    def pending_count(self, request):
        count = Order.objects.filter(status=Order.STATUS_PENDING).count()
        return Response({'count': count})

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
        sale = Sale.objects.create(
            customer=customer,
            payment_type=order.payment_type,
            installment_count=order.installment_count if order.payment_type == Order.PAYMENT_INSTALLMENTS else 1,
            sale_date=today,
            notes=f'Generada desde Pedido #{order.id}. {order.notes}'.strip(),
        )
        for item in items:
            SaleItem.objects.create(
                sale=sale, product=item.product, quantity=item.quantity, unit_price=item.unit_price,
            )
            item.product.register_sale_exit(item.quantity, reason=f'Venta - Pedido #{order.id}')
        sale.generate_installments()

        order.status = Order.STATUS_CONVERTED
        order.linked_sale = sale
        order.save()
        log_action(
            request.user, AuditLog.ACTION_CUSTOM, order,
            description=f'Convirtió el pedido en la venta #{sale.id}',
        )

        return Response({
            'order': self.get_serializer(order).data,
            'sale_ids': [sale.id],
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def home_dashboard(request):
    today = timezone.now().date()
    soon = today + timedelta(days=2)

    # Sin UPDATE masivo: este endpoint se llama en cada carga del panel, asi
    # que reescribir toda la tabla de cuotas aca (con miles de filas y
    # varios usuarios concurrentes) es lo que colgaba el sitio en produccion.
    DASHBOARD_LIMIT = 20

    customer_installments_qs = Installment.objects.filter(
        status__in=[Installment.STATUS_OVERDUE, Installment.STATUS_PENDING],
        due_date__lte=soon,
    ).order_by('due_date')
    customer_installments_count = customer_installments_qs.count()
    customer_installments = customer_installments_qs.select_related(
        'sale', 'sale__customer'
    ).prefetch_related('payments', 'sale__items', 'sale__items__product')[:DASHBOARD_LIMIT]

    supplier_installments_qs = PurchaseInstallment.objects.filter(
        status__in=[PurchaseInstallment.STATUS_OVERDUE, PurchaseInstallment.STATUS_PENDING],
        due_date__lte=soon,
    ).order_by('due_date')
    supplier_installments_count = supplier_installments_qs.count()
    supplier_installments = supplier_installments_qs.select_related(
        'purchase_invoice', 'purchase_invoice__supplier'
    )[:DASHBOARD_LIMIT]

    pending_orders = Order.objects.filter(status=Order.STATUS_PENDING).count()

    low_stock_products = Product.objects.filter(
        is_active=True, stock__lte=F('min_stock')
    ).order_by('stock')[:10]

    return Response({
        'pending_orders': pending_orders,
        'customer_installments': InstallmentSerializer(customer_installments, many=True).data,
        'customer_installments_count': customer_installments_count,
        'supplier_installments': PurchaseInstallmentSerializer(supplier_installments, many=True).data,
        'supplier_installments_count': supplier_installments_count,
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

    sales_qs = Sale.objects.filter(sale_date__gte=date_from, sale_date__lte=date_to)
    if category_id:
        sales_qs = sales_qs.filter(items__product__category_id=category_id).distinct()
    if payment_type:
        sales_qs = sales_qs.filter(payment_type=payment_type)

    sale_items_qs = SaleItem.objects.filter(sale__in=sales_qs)

    range_days = (date.fromisoformat(str(date_to)) - date.fromisoformat(str(date_from))).days
    trunc_fn = TruncDay if range_days <= 45 else TruncWeek if range_days <= 180 else TruncMonth

    sales_over_time = list(
        sale_items_qs.annotate(period=trunc_fn('sale__sale_date'))
        .values('period')
        .annotate(total=Sum(F('unit_price') * F('quantity')))
        .order_by('period')
    )
    sales_count_by_period = dict(
        sales_qs.annotate(period=trunc_fn('sale_date')).values('period').annotate(count=Count('id')).values_list('period', 'count')
    )
    for row in sales_over_time:
        row['count'] = sales_count_by_period.get(row['period'], 0)

    item_summary = sale_items_qs.aggregate(
        total_revenue=Sum(F('unit_price') * F('quantity')),
        total_units=Sum('quantity'),
    )
    total_revenue = item_summary['total_revenue'] or 0
    total_sales = sales_qs.count()
    avg_ticket = (total_revenue / total_sales) if total_sales else 0

    by_payment_type = list(
        sale_items_qs.values('sale__payment_type')
        .annotate(total=Sum(F('unit_price') * F('quantity')))
        .order_by('-total')
    )
    sales_count_by_payment = dict(sales_qs.values('payment_type').annotate(count=Count('id')).values_list('payment_type', 'count'))
    for row in by_payment_type:
        row['payment_type'] = row.pop('sale__payment_type')
        row['count'] = sales_count_by_payment.get(row['payment_type'], 0)

    top_products = list(
        sale_items_qs.values('product_id', 'product__name')
        .annotate(units=Sum('quantity'), total=Sum(F('unit_price') * F('quantity')))
        .order_by('-units')[:10]
    )

    top_categories = list(
        sale_items_qs.values('product__category_id', 'product__category__name')
        .annotate(units=Sum('quantity'), total=Sum(F('unit_price') * F('quantity')))
        .order_by('-total')[:10]
    )

    top_customers = list(
        sale_items_qs.values('sale__customer_id', 'sale__customer__full_name')
        .annotate(total=Sum(F('unit_price') * F('quantity')))
        .order_by('-total')[:10]
    )
    purchases_by_customer = dict(sales_qs.values('customer_id').annotate(count=Count('id')).values_list('customer_id', 'count'))
    for row in top_customers:
        row['customer_id'] = row.pop('sale__customer_id')
        row['customer__full_name'] = row.pop('sale__customer__full_name')
        row['purchases'] = purchases_by_customer.get(row['customer_id'], 0)

    customer_overdue_or_marked_q = Q(status=Installment.STATUS_OVERDUE) | Q(status=Installment.STATUS_PENDING, due_date__lt=today)
    customer_pending_not_overdue_q = Q(status=Installment.STATUS_PENDING, due_date__gte=today)

    installment_totals = Installment.objects.filter(
        sale__in=sales_qs
    ).aggregate(
        pending=Sum('amount', filter=customer_pending_not_overdue_q),
        overdue=Sum('amount', filter=customer_overdue_or_marked_q),
        paid=Sum('paid_amount', filter=Q(status=Installment.STATUS_PAID)),
    )

    top_debtors = list(
        Customer.objects.annotate(
            debt=Sum('sales__installments__amount', filter=Q(sales__installments__status__in=[
                Installment.STATUS_PENDING, Installment.STATUS_OVERDUE
            ])),
            overdue_count=Count('sales__installments', filter=(
                Q(sales__installments__status=Installment.STATUS_OVERDUE) |
                Q(sales__installments__status=Installment.STATUS_PENDING, sales__installments__due_date__lt=today)
            )),
        ).filter(debt__gt=0).order_by('-debt')[:10]
    )

    purchase_invoices_qs = PurchaseInvoice.objects.filter(purchase_date__gte=date_from, purchase_date__lte=date_to)

    supplier_overdue_or_marked_q = Q(status=PurchaseInstallment.STATUS_OVERDUE) | Q(status=PurchaseInstallment.STATUS_PENDING, due_date__lt=today)
    supplier_pending_not_overdue_q = Q(status=PurchaseInstallment.STATUS_PENDING, due_date__gte=today)

    purchase_installment_totals = PurchaseInstallment.objects.filter(
        purchase_invoice__in=purchase_invoices_qs
    ).aggregate(
        pending=Sum('amount', filter=supplier_pending_not_overdue_q),
        overdue=Sum('amount', filter=supplier_overdue_or_marked_q),
        paid=Sum('paid_amount', filter=Q(status=PurchaseInstallment.STATUS_PAID)),
    )

    top_creditors = list(
        Supplier.objects.annotate(
            debt=Sum('purchase_invoices__purchase_installments__amount', filter=Q(purchase_invoices__purchase_installments__status__in=[
                PurchaseInstallment.STATUS_PENDING, PurchaseInstallment.STATUS_OVERDUE
            ])),
            overdue_count=Count('purchase_invoices__purchase_installments', filter=(
                Q(purchase_invoices__purchase_installments__status=PurchaseInstallment.STATUS_OVERDUE) |
                Q(purchase_invoices__purchase_installments__status=PurchaseInstallment.STATUS_PENDING, purchase_invoices__purchase_installments__due_date__lt=today)
            )),
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
            'total_units': item_summary['total_units'] or 0,
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
