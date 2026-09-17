from django.db import models
from decimal import Decimal

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='Nombre')
    description = models.TextField(blank=True, verbose_name='Descripción')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['name']
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'

    def __str__(self):
        return self.name

class Supplier(models.Model):
    name = models.CharField(max_length=200, verbose_name='Nombre / Razón Social')
    contact_name = models.CharField(max_length=200, blank=True, verbose_name='Persona de Contacto')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    email = models.EmailField(blank=True, verbose_name='Correo Electrónico')
    address = models.TextField(blank=True, verbose_name='Dirección')
    ruc = models.CharField(max_length=30, blank=True, verbose_name='RUC')
    notes = models.TextField(blank=True, verbose_name='Notas')
    is_active = models.BooleanField(default=True, verbose_name='Activo')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['name']
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200, verbose_name='Nombre')
    description = models.TextField(verbose_name='Descripción')
    price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Precio')
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Precio de Costo', help_text='Costo de compra al proveedor, usado para calcular el gasto de mercadería al reponer stock')
    usual_supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='usual_products', verbose_name='Proveedor Habitual')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products', verbose_name='Categoría')
    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name='Imagen')
    brand = models.CharField(max_length=100, blank=True, verbose_name='Marca')
    model = models.CharField(max_length=100, blank=True, verbose_name='Modelo')
    stock = models.IntegerField(default=0, verbose_name='Stock')
    min_stock = models.PositiveIntegerField(default=3, verbose_name='Stock Mínimo', help_text='Cantidad a partir de la cual se avisa que el stock está bajo')
    is_active = models.BooleanField(default=True, verbose_name='Activo')
    installment_options = models.CharField(max_length=100, default='3,6,12', verbose_name='Opciones de Cuotas', help_text="Números de cuotas separados por comas (ej: 3,6,12)")
    installment_interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name='Tasa de Interés para Cuotas', help_text="Porcentaje de interés a aplicar en todas las cuotas")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'

    def __str__(self):
        stock_label = f'{self.stock} disp.' if self.stock > 0 else 'sin stock'
        return f'{self.name} — Gs. {self.price:,.0f}'.replace(',', '.') + f' ({stock_label})'

    def get_discounted_price(self):
        from django.utils import timezone
        active_promotion = self.promotions.filter(
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now()
        ).first()

        if active_promotion:
            discount_amount = (self.price * active_promotion.discount_percent) / 100
            return round(self.price - discount_amount, 2)
        return self.price

    def get_first_image(self):
        first = self.images.first()
        if first:
            return first.image.url
        if self.image:
            return self.image.url
        return None

    def add_stock(self, quantity, note='', skip_expense=False, supplier=None):
        from django.utils import timezone
        if quantity <= 0:
            raise ValueError('La cantidad a ingresar debe ser mayor a cero.')

        self.stock = models.F('stock') + quantity
        self.save(update_fields=['stock'])
        self.refresh_from_db(fields=['stock'])

        expense = None
        if not skip_expense and self.cost_price and self.cost_price > 0:
            expense = Expense.objects.create(
                amount=self.cost_price * quantity,
                category=Expense.CATEGORY_MERCHANDISE,
                description=(note or f'Ingreso de stock: {quantity} x {self.name}'),
                expense_date=timezone.now().date(),
            )

        reason = note or 'Ingreso de mercadería'
        if supplier:
            reason = f'{reason} (Proveedor: {supplier.name})' if note else f'Ingreso de mercadería — Proveedor: {supplier.name}'

        StockMovement.objects.create(
            product=self,
            movement_type=StockMovement.TYPE_IN,
            quantity=quantity,
            reason=reason,
            resulting_stock=self.stock,
        )
        return expense

    def register_sale_exit(self, quantity, reason=''):
        if quantity <= 0:
            raise ValueError('La cantidad debe ser mayor a cero.')

        self.stock = models.F('stock') - quantity
        self.save(update_fields=['stock'])
        self.refresh_from_db(fields=['stock'])

        StockMovement.objects.create(
            product=self,
            movement_type=StockMovement.TYPE_OUT,
            quantity=-quantity,
            reason=reason or 'Salida por venta',
            resulting_stock=self.stock,
        )

    def adjust_stock(self, quantity_delta, reason):
        if quantity_delta == 0:
            raise ValueError('El ajuste debe ser distinto de cero.')
        if not reason:
            raise ValueError('El motivo del ajuste es obligatorio.')

        self.stock = models.F('stock') + quantity_delta
        self.save(update_fields=['stock'])
        self.refresh_from_db(fields=['stock'])

        StockMovement.objects.create(
            product=self,
            movement_type=StockMovement.TYPE_ADJUSTMENT,
            quantity=quantity_delta,
            reason=reason,
            resulting_stock=self.stock,
        )


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images', verbose_name='Producto')
    image = models.ImageField(upload_to='products/', verbose_name='Imagen')
    order = models.PositiveIntegerField(default=0, verbose_name='Orden')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')

    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Imagen de Producto'
        verbose_name_plural = 'Imágenes de Producto'

    def __str__(self):
        return f'Imagen de {self.product.name} (#{self.order})'


class StockMovement(models.Model):
    TYPE_IN = 'IN'
    TYPE_OUT = 'OUT'
    TYPE_ADJUSTMENT = 'ADJUSTMENT'
    TYPE_CHOICES = [
        (TYPE_IN, 'Entrada'),
        (TYPE_OUT, 'Salida'),
        (TYPE_ADJUSTMENT, 'Ajuste'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements', verbose_name='Producto')
    movement_type = models.CharField(max_length=12, choices=TYPE_CHOICES, verbose_name='Tipo')
    quantity = models.IntegerField(verbose_name='Cantidad', help_text='Positivo para entradas/ajustes positivos, negativo para salidas/ajustes negativos')
    reason = models.CharField(max_length=255, blank=True, verbose_name='Motivo')
    resulting_stock = models.IntegerField(verbose_name='Stock Resultante')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Movimiento de Stock'
        verbose_name_plural = 'Movimientos de Stock'

    def __str__(self):
        return f'{self.get_movement_type_display()} {self.quantity} - {self.product.name}'


class Promotion(models.Model):
    name = models.CharField(max_length=200, verbose_name='Nombre')
    description = models.TextField(blank=True, verbose_name='Descripción')
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name='% de Descuento')
    start_date = models.DateTimeField(verbose_name='Fecha de Inicio')
    end_date = models.DateTimeField(verbose_name='Fecha de Fin')
    products = models.ManyToManyField(Product, related_name='promotions', blank=True, verbose_name='Productos')
    is_active = models.BooleanField(default=True, verbose_name='Activo')
    interest_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name='% de Interés', help_text="Porcentaje de interés para cuotas")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Promoción'
        verbose_name_plural = 'Promociones'

    def __str__(self):
        return self.name

class CompanyInfo(models.Model):
    name = models.CharField(max_length=200, default="Tienda Electrodomésticos", verbose_name='Nombre')
    legal_name = models.CharField(max_length=200, blank=True, verbose_name='Razón Social')
    ruc = models.CharField(max_length=30, blank=True, verbose_name='RUC')
    business_hours = models.CharField(max_length=200, blank=True, verbose_name='Horario de Atención', help_text="Ej: Lunes a Viernes 8:00 - 18:00")
    phone = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    whatsapp = models.CharField(max_length=20, blank=True, verbose_name='WhatsApp')
    email = models.EmailField(blank=True, verbose_name='Correo Electrónico')
    address = models.TextField(blank=True, verbose_name='Dirección')

    facebook_url = models.URLField(blank=True, verbose_name='Facebook')
    instagram_url = models.URLField(blank=True, verbose_name='Instagram')
    twitter_url = models.URLField(blank=True, verbose_name='Twitter')
    youtube_url = models.URLField(blank=True, verbose_name='YouTube')
    linkedin_url = models.URLField(blank=True, verbose_name='LinkedIn')

    about_text = models.TextField(blank=True, verbose_name='Acerca de Nosotros')
    logo = models.ImageField(upload_to='company/', blank=True, null=True, verbose_name='Logo')

    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        verbose_name = 'Información de la Empresa'
        verbose_name_plural = 'Información de la Empresa'

    def __str__(self):
        return self.name

class Customer(models.Model):
    full_name = models.CharField(max_length=200, verbose_name='Nombre Completo')
    document_number = models.CharField(max_length=30, unique=True, verbose_name='CI/RUC')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    email = models.EmailField(blank=True, verbose_name='Correo Electrónico')
    address = models.TextField(blank=True, verbose_name='Dirección')
    id_document_image = models.ImageField(upload_to='customers/', blank=True, null=True, verbose_name='Foto de Cédula')
    maps_location_url = models.URLField(blank=True, verbose_name='Ubicación (Google Maps)')
    economic_activity = models.CharField(max_length=200, blank=True, verbose_name='Actividad Económica')
    reference1_name = models.CharField(max_length=200, blank=True, verbose_name='Referencia 1 - Nombre')
    reference1_phone = models.CharField(max_length=20, blank=True, verbose_name='Referencia 1 - Teléfono')
    reference1_relation = models.CharField(max_length=100, blank=True, verbose_name='Referencia 1 - Relación')
    reference2_name = models.CharField(max_length=200, blank=True, verbose_name='Referencia 2 - Nombre')
    reference2_phone = models.CharField(max_length=20, blank=True, verbose_name='Referencia 2 - Teléfono')
    reference2_relation = models.CharField(max_length=100, blank=True, verbose_name='Referencia 2 - Relación')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['full_name']
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'

    def __str__(self):
        return f'{self.full_name} ({self.document_number})'


class Sale(models.Model):
    PAYMENT_CASH = 'CASH'
    PAYMENT_INSTALLMENTS = 'INSTALLMENTS'
    PAYMENT_TYPE_CHOICES = [
        (PAYMENT_CASH, 'Contado'),
        (PAYMENT_INSTALLMENTS, 'Cuotas'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='sales', verbose_name='Cliente')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default=PAYMENT_CASH, verbose_name='Tipo de Pago')
    installment_count = models.PositiveIntegerField(default=1, verbose_name='Cantidad de Cuotas')
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name='Tasa de Interés (%)')
    down_payment = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Entrega Inicial')
    payment_day = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name='Día de Pago Mensual')
    late_fee_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name='Interés por Mora (%)')
    sale_date = models.DateField(verbose_name='Fecha de Venta')
    notes = models.TextField(blank=True, verbose_name='Notas')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['-sale_date', '-created_at']
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
        indexes = [
            models.Index(fields=['sale_date']),
        ]

    def __str__(self):
        return f'Venta #{self.id} - {self.customer.full_name}'

    @property
    def subtotal(self):
        return sum((item.subtotal for item in self.items.all()), Decimal('0'))

    @property
    def total_amount(self):
        subtotal = self.subtotal
        if self.payment_type == self.PAYMENT_INSTALLMENTS:
            return round(subtotal * (1 + self.interest_rate / Decimal('100')), 2)
        return subtotal

    @property
    def remaining_amount(self):
        if self.payment_type != self.PAYMENT_INSTALLMENTS:
            return Decimal('0')
        if 'installments' in getattr(self, '_prefetched_objects_cache', {}):
            # Filtramos en memoria (ya esta prefetched, no dispara query nueva)
            # excluyendo PAID explicitamente, igual que la rama sin prefetch.
            # No podemos confiar en i.remaining_amount para decidir que esta
            # pendiente: cuotas migradas del sistema legado tienen
            # status=PAID + paid_amount cargado a mano, pero sin un
            # InstallmentPayment real, asi que su remaining_amount calculado
            # (amount - paid_so_far) da el monto completo en vez de 0.
            pending = [i for i in self.installments.all() if i.status != Installment.STATUS_PAID]
            return sum((i.remaining_amount for i in pending), Decimal('0'))
        pending = self.installments.exclude(status=Installment.STATUS_PAID)
        return sum((i.remaining_amount for i in pending), Decimal('0'))

    def generate_installments(self):
        from dateutil.relativedelta import relativedelta
        import calendar

        self.installments.all().delete()

        if self.payment_type != self.PAYMENT_INSTALLMENTS or self.installment_count < 1:
            return

        total = self.total_amount - self.down_payment
        if total < 0:
            total = Decimal('0')
        base_amount = (total / self.installment_count).quantize(Decimal('0.01'))
        remainder = total - (base_amount * self.installment_count)

        for i in range(1, self.installment_count + 1):
            amount = base_amount
            if i == self.installment_count:
                amount += remainder
            due_date = self.sale_date + relativedelta(months=i)
            if self.payment_day:
                last_day = calendar.monthrange(due_date.year, due_date.month)[1]
                due_date = due_date.replace(day=min(self.payment_day, last_day))
            Installment.objects.create(
                sale=self,
                number=i,
                amount=amount,
                due_date=due_date,
            )


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items', verbose_name='Venta')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='sale_items', verbose_name='Producto')
    quantity = models.PositiveIntegerField(default=1, verbose_name='Cantidad')
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Precio Unitario')

    class Meta:
        verbose_name = 'Ítem de Venta'
        verbose_name_plural = 'Ítems de Venta'

    def __str__(self):
        return f'{self.quantity} x {self.product.name}'

    @property
    def subtotal(self):
        return self.unit_price * self.quantity


class Order(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_CONTACTED = 'CONTACTED'
    STATUS_CONVERTED = 'CONVERTED'
    STATUS_DISCARDED = 'DISCARDED'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_CONTACTED, 'Contactado'),
        (STATUS_CONVERTED, 'Convertido en venta'),
        (STATUS_DISCARDED, 'Descartado'),
    ]

    PAYMENT_CASH = 'CASH'
    PAYMENT_INSTALLMENTS = 'INSTALLMENTS'
    PAYMENT_TYPE_CHOICES = [
        (PAYMENT_CASH, 'Contado'),
        (PAYMENT_INSTALLMENTS, 'Cuotas'),
    ]

    customer_name = models.CharField(max_length=200, verbose_name='Nombre Completo')
    customer_phone = models.CharField(max_length=20, verbose_name='Teléfono')
    customer_email = models.EmailField(blank=True, verbose_name='Correo Electrónico')
    customer_document = models.CharField(max_length=30, blank=True, verbose_name='CI/RUC')
    customer_address = models.TextField(blank=True, verbose_name='Dirección de Entrega')

    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default=PAYMENT_CASH, verbose_name='Forma de Pago Deseada')
    installment_count = models.PositiveIntegerField(default=1, verbose_name='Cantidad de Cuotas')
    notes = models.TextField(blank=True, verbose_name='Notas del Cliente')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Estado')
    linked_sale = models.ForeignKey(Sale, on_delete=models.SET_NULL, null=True, blank=True, related_name='source_orders', verbose_name='Venta Generada')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Pedido'
        verbose_name_plural = 'Pedidos'

    def __str__(self):
        return f'Pedido #{self.id} - {self.customer_name}'

    @property
    def total_amount(self):
        return sum((item.subtotal for item in self.items.all()), Decimal('0'))


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items', verbose_name='Pedido')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items', verbose_name='Producto')
    quantity = models.PositiveIntegerField(default=1, verbose_name='Cantidad')
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Precio Unitario')

    class Meta:
        verbose_name = 'Ítem de Pedido'
        verbose_name_plural = 'Ítems de Pedido'

    def __str__(self):
        return f'{self.quantity} x {self.product.name}'

    @property
    def subtotal(self):
        return self.unit_price * self.quantity


class Installment(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_PAID = 'PAID'
    STATUS_OVERDUE = 'OVERDUE'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_PAID, 'Pagada'),
        (STATUS_OVERDUE, 'Atrasada'),
    ]

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='installments', verbose_name='Venta')
    number = models.PositiveIntegerField(verbose_name='Número de Cuota')
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Monto')
    due_date = models.DateField(verbose_name='Fecha de Vencimiento')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Estado')
    paid_date = models.DateField(null=True, blank=True, verbose_name='Fecha de Pago')
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Monto Pagado')
    late_fee_enabled = models.BooleanField(default=True, verbose_name='Recargo por Mora Habilitado')
    late_fee_override = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name='Monto de Mora Editado Manualmente',
    )

    class Meta:
        ordering = ['sale', 'number']
        verbose_name = 'Cuota'
        verbose_name_plural = 'Cuotas'
        unique_together = ['sale', 'number']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f'{self.sale.customer.full_name} - Cuota {self.number}/{self.sale.installment_count}'

    @property
    def is_overdue(self):
        from django.utils import timezone
        return self.status == self.STATUS_PENDING and self.due_date < timezone.now().date()

    @property
    def paid_so_far(self):
        # Si payments ya viene precargado (prefetch_related), sumar en memoria
        # evita una query por cuota al listar muchas (N+1). Si no, cae al
        # aggregate normal (una sola cuota consultada de forma aislada).
        if 'payments' in getattr(self, '_prefetched_objects_cache', {}):
            return sum((p.amount for p in self.payments.all()), Decimal('0'))
        total = self.payments.aggregate(total=models.Sum('amount'))['total']
        return total or Decimal('0')

    @property
    def remaining_amount(self):
        remaining = self.amount - self.paid_so_far
        return remaining if remaining > 0 else Decimal('0')

    @property
    def late_fee_amount(self):
        """Recargo por mora sobre el saldo pendiente. Por defecto se calcula
        en el momento (no se persiste): tasa mensual de la venta prorrateada
        por los días de atraso desde el vencimiento. Puede deshabilitarse
        (late_fee_enabled=False) o reemplazarse por un monto manual
        (late_fee_override) por cuota."""
        if not self.late_fee_enabled or self.status == self.STATUS_PAID:
            return Decimal('0')

        if self.late_fee_override is not None:
            return self.late_fee_override

        from django.utils import timezone

        rate = self.sale.late_fee_rate
        if not rate:
            return Decimal('0')

        today = timezone.now().date()
        if self.due_date >= today:
            return Decimal('0')

        days_late = (today - self.due_date).days
        months_late = Decimal(days_late) / Decimal('30')
        fee = self.remaining_amount * (rate / Decimal('100')) * months_late
        return fee.quantize(Decimal('0.01'))

    @property
    def total_with_late_fee(self):
        return self.remaining_amount + self.late_fee_amount

    def register_payment(self, amount, payment_date=None, created_by=None):
        """
        Registra un abono contra esta cuota. Si el monto supera el saldo
        pendiente, el excedente se aplica automáticamente como pago
        adelantado a la siguiente cuota pendiente de la misma venta
        (respetando el orden de pago consecutivo).
        Devuelve (cuotas_afectadas, sobrante_sin_aplicar): la lista de cuotas
        tocadas (esta y, si aplica, las siguientes cubiertas con el
        excedente) y el monto que no se pudo aplicar porque ya no quedan
        cuotas pendientes en la venta (venta ya saldada por completo).
        """
        from django.utils import timezone
        payment_date = payment_date or timezone.now().date()
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValueError('El monto del pago debe ser mayor a cero.')

        affected = [self]
        remaining_to_apply = amount
        current = self

        while remaining_to_apply > 0 and current is not None:
            owed = current.remaining_amount
            applied = min(owed, remaining_to_apply)
            InstallmentPayment.objects.create(
                installment=current,
                amount=applied,
                payment_date=payment_date,
                created_by=created_by,
                note='' if current is self else f'Excedente aplicado de la cuota {self.number}',
            )
            remaining_to_apply -= applied
            current._prefetched_objects_cache = {}

            if current.remaining_amount <= 0:
                current.status = self.STATUS_PAID
                current.paid_date = payment_date
                current.paid_amount = current.paid_so_far
                current.save()

                if remaining_to_apply > 0:
                    current = Installment.objects.filter(
                        sale=current.sale, number__gt=current.number,
                    ).exclude(status=self.STATUS_PAID).order_by('number').first()
                    if current:
                        affected.append(current)
                    continue
            else:
                current.paid_amount = current.paid_so_far
                current.save()

            break

        return affected, remaining_to_apply

    def mark_as_paid(self, paid_date=None, paid_amount=None):
        from django.utils import timezone
        self.status = self.STATUS_PAID
        self.paid_date = paid_date or timezone.now().date()
        self.paid_amount = paid_amount or self.amount
        self.save()

    def revert_payment(self):
        from django.utils import timezone
        self.payments.all().delete()
        self.status = self.STATUS_OVERDUE if self.due_date < timezone.now().date() else self.STATUS_PENDING
        self.paid_date = None
        self.paid_amount = None
        self.save()


class InstallmentPayment(models.Model):
    installment = models.ForeignKey(Installment, on_delete=models.CASCADE, related_name='payments', verbose_name='Cuota')
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Monto Abonado')
    payment_date = models.DateField(verbose_name='Fecha de Pago')
    created_by = models.ForeignKey('auth.User', null=True, blank=True, on_delete=models.SET_NULL, verbose_name='Registrado por')
    note = models.CharField(max_length=200, blank=True, verbose_name='Nota')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')

    class Meta:
        ordering = ['installment', 'created_at']
        verbose_name = 'Abono de Cuota'
        verbose_name_plural = 'Abonos de Cuotas'

    def __str__(self):
        return f'Abono Gs. {self.amount} - Cuota {self.installment_id} ({self.payment_date})'


class PurchaseInvoice(models.Model):
    PAYMENT_CASH = 'CASH'
    PAYMENT_INSTALLMENTS = 'INSTALLMENTS'
    PAYMENT_TYPE_CHOICES = [
        (PAYMENT_CASH, 'Contado'),
        (PAYMENT_INSTALLMENTS, 'Cuotas'),
    ]

    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_invoices', verbose_name='Proveedor')
    invoice_number = models.CharField(max_length=50, blank=True, verbose_name='N° de Factura')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default=PAYMENT_CASH, verbose_name='Tipo de Pago')
    installment_count = models.PositiveIntegerField(default=1, verbose_name='Cantidad de Cuotas')
    purchase_date = models.DateField(verbose_name='Fecha de Compra')
    notes = models.TextField(blank=True, verbose_name='Notas')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['-purchase_date', '-created_at']
        verbose_name = 'Compra a Proveedor'
        verbose_name_plural = 'Compras a Proveedores'
        indexes = [
            models.Index(fields=['purchase_date']),
        ]

    def __str__(self):
        return f'Compra #{self.id} - {self.supplier.name}'

    @property
    def total_amount(self):
        return sum((item.subtotal for item in self.items.all()), Decimal('0'))

    @property
    def remaining_amount(self):
        if self.payment_type != self.PAYMENT_INSTALLMENTS:
            return Decimal('0')
        if 'purchase_installments' in getattr(self, '_prefetched_objects_cache', {}):
            # Ver nota equivalente en Sale.remaining_amount: no confiar en
            # i.remaining_amount para filtrar, cuotas migradas pueden tener
            # status=PAID sin un PurchaseInstallmentPayment real detras.
            pending = [i for i in self.purchase_installments.all() if i.status != PurchaseInstallment.STATUS_PAID]
            return sum((i.remaining_amount for i in pending), Decimal('0'))
        pending = self.purchase_installments.exclude(status=PurchaseInstallment.STATUS_PAID)
        return sum((i.remaining_amount for i in pending), Decimal('0'))

    def generate_installments(self):
        from dateutil.relativedelta import relativedelta

        self.purchase_installments.all().delete()

        if self.payment_type != self.PAYMENT_INSTALLMENTS or self.installment_count < 1:
            return

        total = self.total_amount
        base_amount = (total / self.installment_count).quantize(Decimal('0.01'))
        remainder = total - (base_amount * self.installment_count)

        for i in range(1, self.installment_count + 1):
            amount = base_amount
            if i == self.installment_count:
                amount += remainder
            PurchaseInstallment.objects.create(
                purchase_invoice=self,
                number=i,
                amount=amount,
                due_date=self.purchase_date + relativedelta(months=i),
            )


class PurchaseInvoiceItem(models.Model):
    purchase_invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.CASCADE, related_name='items', verbose_name='Compra')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='purchase_invoice_items', verbose_name='Producto')
    quantity = models.PositiveIntegerField(default=1, verbose_name='Cantidad')
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Costo Unitario')

    class Meta:
        verbose_name = 'Ítem de Compra'
        verbose_name_plural = 'Ítems de Compra'

    def __str__(self):
        return f'{self.quantity} x {self.product.name}'

    @property
    def subtotal(self):
        return self.unit_cost * self.quantity


class PurchaseInstallment(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_PAID = 'PAID'
    STATUS_OVERDUE = 'OVERDUE'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_PAID, 'Pagada'),
        (STATUS_OVERDUE, 'Atrasada'),
    ]

    purchase_invoice = models.ForeignKey(PurchaseInvoice, on_delete=models.CASCADE, related_name='purchase_installments', verbose_name='Compra')
    number = models.PositiveIntegerField(verbose_name='Número de Cuota')
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Monto')
    due_date = models.DateField(verbose_name='Fecha de Vencimiento')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Estado')
    paid_date = models.DateField(null=True, blank=True, verbose_name='Fecha de Pago')
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name='Monto Pagado')
    expense = models.ForeignKey('Expense', on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_installment', verbose_name='Gasto Generado')

    class Meta:
        ordering = ['purchase_invoice', 'number']
        verbose_name = 'Cuota a Proveedor'
        verbose_name_plural = 'Cuotas a Proveedores'
        unique_together = ['purchase_invoice', 'number']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f'{self.purchase_invoice.supplier.name} - Cuota {self.number}/{self.purchase_invoice.installment_count}'

    @property
    def is_overdue(self):
        from django.utils import timezone
        return self.status == self.STATUS_PENDING and self.due_date < timezone.now().date()

    @property
    def paid_so_far(self):
        if 'payments' in getattr(self, '_prefetched_objects_cache', {}):
            return sum((p.amount for p in self.payments.all()), Decimal('0'))
        total = self.payments.aggregate(total=models.Sum('amount'))['total']
        return total or Decimal('0')

    @property
    def remaining_amount(self):
        remaining = self.amount - self.paid_so_far
        return remaining if remaining > 0 else Decimal('0')

    def register_payment(self, amount, payment_date=None, created_by=None):
        """
        Registra un abono contra esta cuota a proveedor. Si el monto supera
        el saldo pendiente, el excedente se aplica automáticamente a la
        siguiente cuota pendiente de la misma compra. Cada abono genera su
        propio gasto de mercadería por el monto realmente aplicado.
        Devuelve (cuotas_afectadas, sobrante_sin_aplicar).
        """
        from django.utils import timezone
        payment_date = payment_date or timezone.now().date()
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValueError('El monto del pago debe ser mayor a cero.')

        affected = [self]
        remaining_to_apply = amount
        current = self

        while remaining_to_apply > 0 and current is not None:
            owed = current.remaining_amount
            applied = min(owed, remaining_to_apply)
            expense = Expense.objects.create(
                amount=applied,
                category=Expense.CATEGORY_MERCHANDISE,
                description=(
                    f'Pago cuota {current.number}/{current.purchase_invoice.installment_count} - '
                    f'Compra #{current.purchase_invoice.id} - {current.purchase_invoice.supplier.name}'
                    + ('' if current is self else f' (excedente de la cuota {self.number})')
                ),
                expense_date=payment_date,
            )
            PurchaseInstallmentPayment.objects.create(
                installment=current,
                amount=applied,
                payment_date=payment_date,
                created_by=created_by,
                expense=expense,
                note='' if current is self else f'Excedente aplicado de la cuota {self.number}',
            )
            remaining_to_apply -= applied
            current._prefetched_objects_cache = {}

            if current.remaining_amount <= 0:
                current.status = self.STATUS_PAID
                current.paid_date = payment_date
                current.paid_amount = current.paid_so_far
                current.save()

                if remaining_to_apply > 0:
                    current = PurchaseInstallment.objects.filter(
                        purchase_invoice=current.purchase_invoice, number__gt=current.number,
                    ).exclude(status=self.STATUS_PAID).order_by('number').first()
                    if current:
                        affected.append(current)
                    continue
            else:
                current.paid_amount = current.paid_so_far
                current.save()

            break

        return affected, remaining_to_apply

    def mark_as_paid(self, paid_date=None, paid_amount=None):
        from django.utils import timezone
        self.status = self.STATUS_PAID
        self.paid_date = paid_date or timezone.now().date()
        self.paid_amount = paid_amount or self.amount
        self.expense = Expense.objects.create(
            amount=self.paid_amount,
            category=Expense.CATEGORY_MERCHANDISE,
            description=f'Pago cuota {self.number}/{self.purchase_invoice.installment_count} - Compra #{self.purchase_invoice.id} - {self.purchase_invoice.supplier.name}',
            expense_date=self.paid_date,
        )
        self.save()

    def revert_payment(self):
        from django.utils import timezone
        if self.expense_id:
            self.expense.delete()
            self.expense = None
        for payment in self.payments.all():
            if payment.expense_id:
                payment.expense.delete()
        self.payments.all().delete()
        self.status = self.STATUS_OVERDUE if self.due_date < timezone.now().date() else self.STATUS_PENDING
        self.paid_date = None
        self.paid_amount = None
        self.save()


class PurchaseInstallmentPayment(models.Model):
    installment = models.ForeignKey(PurchaseInstallment, on_delete=models.CASCADE, related_name='payments', verbose_name='Cuota a Proveedor')
    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Monto Abonado')
    payment_date = models.DateField(verbose_name='Fecha de Pago')
    created_by = models.ForeignKey('auth.User', null=True, blank=True, on_delete=models.SET_NULL, verbose_name='Registrado por')
    expense = models.ForeignKey('Expense', null=True, blank=True, on_delete=models.SET_NULL, verbose_name='Gasto Generado')
    note = models.CharField(max_length=200, blank=True, verbose_name='Nota')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')

    class Meta:
        ordering = ['installment', 'created_at']
        verbose_name = 'Abono de Cuota a Proveedor'
        verbose_name_plural = 'Abonos de Cuotas a Proveedores'

    def __str__(self):
        return f'Abono Gs. {self.amount} - Cuota proveedor {self.installment_id} ({self.payment_date})'


class Expense(models.Model):
    CATEGORY_RENT = 'RENT'
    CATEGORY_UTILITIES = 'UTILITIES'
    CATEGORY_SALARIES = 'SALARIES'
    CATEGORY_MERCHANDISE = 'MERCHANDISE'
    CATEGORY_MARKETING = 'MARKETING'
    CATEGORY_MAINTENANCE = 'MAINTENANCE'
    CATEGORY_INSURANCE = 'INSURANCE'
    CATEGORY_SUPPLIES = 'SUPPLIES'
    CATEGORY_SALES_COMMISSIONS = 'SALES_COMMISSIONS'
    CATEGORY_OTHER = 'OTHER'
    CATEGORY_CHOICES = [
        (CATEGORY_RENT, 'Alquiler'),
        (CATEGORY_UTILITIES, 'Servicios (luz, agua, internet)'),
        (CATEGORY_SALARIES, 'Sueldos'),
        (CATEGORY_MERCHANDISE, 'Mercadería'),
        (CATEGORY_MARKETING, 'Marketing'),
        (CATEGORY_MAINTENANCE, 'Mantenimiento/Reparaciones'),
        (CATEGORY_INSURANCE, 'Seguros'),
        (CATEGORY_SUPPLIES, 'Insumos de oficina/embalaje'),
        (CATEGORY_SALES_COMMISSIONS, 'Comisiones a vendedores'),
        (CATEGORY_OTHER, 'Otros'),
    ]

    amount = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Monto')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_OTHER, verbose_name='Categoría')
    description = models.CharField(max_length=255, blank=True, verbose_name='Descripción')
    expense_date = models.DateField(verbose_name='Fecha')
    receipt = models.ImageField(upload_to='expenses/', blank=True, null=True, verbose_name='Comprobante')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['-expense_date', '-created_at']
        verbose_name = 'Gasto'
        verbose_name_plural = 'Gastos'

    def __str__(self):
        return f'{self.get_category_display()} - Gs. {self.amount} ({self.expense_date})'


class AuditLog(models.Model):
    ACTION_CREATE = 'CREATE'
    ACTION_UPDATE = 'UPDATE'
    ACTION_DELETE = 'DELETE'
    ACTION_CUSTOM = 'CUSTOM'
    ACTION_CHOICES = [
        (ACTION_CREATE, 'Creación'),
        (ACTION_UPDATE, 'Edición'),
        (ACTION_DELETE, 'Eliminación'),
        (ACTION_CUSTOM, 'Acción'),
    ]

    user = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs', verbose_name='Usuario')
    action = models.CharField(max_length=10, choices=ACTION_CHOICES, verbose_name='Acción')
    model_name = models.CharField(max_length=100, verbose_name='Modelo')
    object_id = models.CharField(max_length=50, blank=True, verbose_name='ID del Objeto')
    object_repr = models.CharField(max_length=255, blank=True, verbose_name='Objeto')
    description = models.CharField(max_length=255, blank=True, verbose_name='Descripción')
    changes = models.JSONField(null=True, blank=True, verbose_name='Cambios')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha')

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Registro de Auditoría'
        verbose_name_plural = 'Registros de Auditoría'

    def __str__(self):
        who = self.user.username if self.user else 'Sistema'
        return f'{who} - {self.get_action_display()} - {self.model_name} ({self.created_at})'
