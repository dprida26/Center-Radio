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
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='sales', verbose_name='Producto')
    quantity = models.PositiveIntegerField(default=1, verbose_name='Cantidad')
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Precio Unitario')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default=PAYMENT_CASH, verbose_name='Tipo de Pago')
    installment_count = models.PositiveIntegerField(default=1, verbose_name='Cantidad de Cuotas')
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name='Tasa de Interés (%)')
    sale_date = models.DateField(verbose_name='Fecha de Venta')
    notes = models.TextField(blank=True, verbose_name='Notas')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        ordering = ['-sale_date', '-created_at']
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'

    def __str__(self):
        return f'Venta #{self.id} - {self.customer.full_name} - {self.product.name}'

    @property
    def total_amount(self):
        subtotal = self.unit_price * self.quantity
        if self.payment_type == self.PAYMENT_INSTALLMENTS:
            return round(subtotal * (1 + self.interest_rate / Decimal('100')), 2)
        return subtotal

    def generate_installments(self):
        from dateutil.relativedelta import relativedelta

        self.installments.all().delete()

        if self.payment_type != self.PAYMENT_INSTALLMENTS or self.installment_count < 1:
            return

        total = self.total_amount
        base_amount = (total / self.installment_count).quantize(Decimal('0.01'))
        remainder = total - (base_amount * self.installment_count)

        for i in range(1, self.installment_count + 1):
            amount = base_amount
            if i == self.installment_count:
                amount += remainder
            Installment.objects.create(
                sale=self,
                number=i,
                amount=amount,
                due_date=self.sale_date + relativedelta(months=i),
            )


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

    class Meta:
        ordering = ['sale', 'number']
        verbose_name = 'Cuota'
        verbose_name_plural = 'Cuotas'
        unique_together = ['sale', 'number']

    def __str__(self):
        return f'{self.sale.customer.full_name} - Cuota {self.number}/{self.sale.installment_count}'

    @property
    def is_overdue(self):
        from django.utils import timezone
        return self.status == self.STATUS_PENDING and self.due_date < timezone.now().date()

    def mark_as_paid(self, paid_date=None, paid_amount=None):
        from django.utils import timezone
        self.status = self.STATUS_PAID
        self.paid_date = paid_date or timezone.now().date()
        self.paid_amount = paid_amount or self.amount
        self.save()

    def revert_payment(self):
        from django.utils import timezone
        self.status = self.STATUS_OVERDUE if self.due_date < timezone.now().date() else self.STATUS_PENDING
        self.paid_date = None
        self.paid_amount = None
        self.save()


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

    def __str__(self):
        return f'Compra #{self.id} - {self.supplier.name}'

    @property
    def total_amount(self):
        return sum((item.subtotal for item in self.items.all()), Decimal('0'))

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

    def __str__(self):
        return f'{self.purchase_invoice.supplier.name} - Cuota {self.number}/{self.purchase_invoice.installment_count}'

    @property
    def is_overdue(self):
        from django.utils import timezone
        return self.status == self.STATUS_PENDING and self.due_date < timezone.now().date()

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
        self.status = self.STATUS_OVERDUE if self.due_date < timezone.now().date() else self.STATUS_PENDING
        self.paid_date = None
        self.paid_amount = None
        self.save()


class Expense(models.Model):
    CATEGORY_RENT = 'RENT'
    CATEGORY_UTILITIES = 'UTILITIES'
    CATEGORY_SALARIES = 'SALARIES'
    CATEGORY_MERCHANDISE = 'MERCHANDISE'
    CATEGORY_MARKETING = 'MARKETING'
    CATEGORY_OTHER = 'OTHER'
    CATEGORY_CHOICES = [
        (CATEGORY_RENT, 'Alquiler'),
        (CATEGORY_UTILITIES, 'Servicios (luz, agua, internet)'),
        (CATEGORY_SALARIES, 'Sueldos'),
        (CATEGORY_MERCHANDISE, 'Mercadería'),
        (CATEGORY_MARKETING, 'Marketing'),
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
