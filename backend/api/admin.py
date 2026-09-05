from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.db.models import Sum
from .models import Category, Product, ProductImage, Promotion, CompanyInfo, Customer, Sale, Installment, Order, OrderItem, Expense, StockMovement, AuditLog

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'product_count', 'created_at']
    search_fields = ['name']
    list_per_page = 25
    fieldsets = (
        (_('Información General'), {
            'fields': ('name', 'description')
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Productos'

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ['image', 'order']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price_display', 'stock', 'is_active', 'created_at']
    list_filter = ['category', 'is_active', 'brand']
    list_editable = ['stock']
    search_fields = ['name', 'brand', 'model']
    list_per_page = 25
    date_hierarchy = 'created_at'
    inlines = [ProductImageInline]
    fieldsets = (
        (_('Información Básica'), {
            'fields': ('name', 'description', 'category')
        }),
        (_('Detalles del Producto'), {
            'fields': ('brand', 'model', 'price', 'cost_price', 'image'),
            'description': 'El campo "Imagen" es el legado de un producto sin galería. Usá la sección de Imágenes más abajo para cargar varias fotos.'
        }),
        (_('Inventario'), {
            'fields': ('stock', 'is_active')
        }),
        (_('Opciones de Pago en Cuotas'), {
            'fields': ('installment_options', 'installment_interest_rate'),
            'description': 'Configura las opciones de cuotas disponibles y el porcentaje de interés a aplicar'
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

    def price_display(self, obj):
        return f'Gs. {obj.price:,.0f}'.replace(',', '.')
    price_display.short_description = 'Precio'
    price_display.admin_order_field = 'price'

@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ['name', 'discount_percent', 'interest_percent', 'start_date', 'end_date', 'is_active']
    list_filter = ['is_active']
    list_editable = ['is_active']
    search_fields = ['name']
    filter_horizontal = ['products']
    date_hierarchy = 'start_date'
    list_per_page = 25
    fieldsets = (
        (_('Información General'), {
            'fields': ('name', 'description', 'is_active')
        }),
        (_('Período de Oferta'), {
            'fields': ('start_date', 'end_date')
        }),
        (_('Descuentos'), {
            'fields': ('discount_percent', 'interest_percent'),
            'description': 'Configura el descuento y el interés para cuotas'
        }),
        (_('Productos'), {
            'fields': ('products',)
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

@admin.register(CompanyInfo)
class CompanyInfoAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email', 'updated_at']
    fieldsets = (
        (_('Información General'), {
            'fields': ('name', 'logo', 'about_text')
        }),
        (_('Datos Legales'), {
            'fields': ('legal_name', 'ruc')
        }),
        (_('Contacto'), {
            'fields': ('phone', 'whatsapp', 'email', 'address', 'business_hours')
        }),
        (_('Redes Sociales'), {
            'fields': ('facebook_url', 'instagram_url', 'twitter_url', 'youtube_url', 'linkedin_url'),
            'classes': ('collapse',)
        }),
        (_('Metadata'), {
            'fields': ('updated_at',),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['updated_at']


class HasDebtFilter(admin.SimpleListFilter):
    title = 'con deuda pendiente'
    parameter_name = 'has_debt'

    def lookups(self, request, model_admin):
        return [('yes', 'Con deuda'), ('overdue', 'Con atraso')]

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(sales__installments__status__in=[
                Installment.STATUS_PENDING, Installment.STATUS_OVERDUE
            ]).distinct()
        if self.value() == 'overdue':
            return queryset.filter(sales__installments__status=Installment.STATUS_OVERDUE).distinct()
        return queryset


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'document_number', 'phone', 'email', 'total_debt_display', 'overdue_count_display']
    list_filter = [HasDebtFilter]
    search_fields = ['full_name', 'document_number', 'phone', 'email']
    list_per_page = 25
    fieldsets = (
        (_('Datos Personales'), {
            'fields': ('full_name', 'document_number', 'phone', 'email', 'address')
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

    def total_debt_display(self, obj):
        total = Installment.objects.filter(
            sale__customer=obj, status__in=[Installment.STATUS_PENDING, Installment.STATUS_OVERDUE]
        ).aggregate(total=Sum('amount'))['total'] or 0
        return f'Gs. {total:,.0f}'.replace(',', '.')
    total_debt_display.short_description = 'Deuda Pendiente'

    def overdue_count_display(self, obj):
        today = timezone.now().date()
        return Installment.objects.filter(
            sale__customer=obj, status=Installment.STATUS_PENDING, due_date__lt=today
        ).count()
    overdue_count_display.short_description = 'Cuotas Atrasadas'


class InstallmentInline(admin.TabularInline):
    model = Installment
    extra = 0
    fields = ['number', 'amount', 'due_date', 'status', 'paid_date', 'paid_amount']
    readonly_fields = ['number', 'amount', 'due_date']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'product', 'payment_type', 'installment_count', 'total_amount_display', 'sale_date']
    list_filter = ['payment_type']
    search_fields = ['customer__full_name', 'customer__document_number', 'product__name']
    autocomplete_fields = ['customer', 'product']
    date_hierarchy = 'sale_date'
    list_per_page = 25
    inlines = [InstallmentInline]
    fieldsets = (
        (_('Venta'), {
            'fields': ('customer', 'product', 'quantity', 'unit_price', 'sale_date', 'notes')
        }),
        (_('Forma de Pago'), {
            'fields': ('payment_type', 'installment_count', 'interest_rate'),
            'description': 'Si el pago es en cuotas, se generarán automáticamente al guardar'
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']

    def total_amount_display(self, obj):
        return f'Gs. {obj.total_amount:,.0f}'.replace(',', '.')
    total_amount_display.short_description = 'Monto Total'

    def save_model(self, request, obj, form, change):
        is_new = obj.pk is None
        super().save_model(request, obj, form, change)
        obj.generate_installments()
        if is_new:
            obj.product.register_sale_exit(obj.quantity, reason=f'Venta #{obj.id}')


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ['product', 'quantity', 'unit_price']
    autocomplete_fields = ['product']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer_name', 'customer_phone', 'status', 'total_amount_display', 'created_at']
    list_filter = ['status', 'payment_type']
    list_editable = ['status']
    search_fields = ['customer_name', 'customer_phone', 'customer_document', 'customer_email']
    date_hierarchy = 'created_at'
    list_per_page = 25
    inlines = [OrderItemInline]
    fieldsets = (
        (_('Datos del Cliente'), {
            'fields': ('customer_name', 'customer_phone', 'customer_email', 'customer_document', 'customer_address')
        }),
        (_('Pedido'), {
            'fields': ('payment_type', 'installment_count', 'notes', 'status', 'linked_sale')
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['linked_sale', 'created_at', 'updated_at']

    def total_amount_display(self, obj):
        return f'Gs. {obj.total_amount:,.0f}'.replace(',', '.')
    total_amount_display.short_description = 'Monto Total'


@admin.register(Installment)
class InstallmentAdmin(admin.ModelAdmin):
    list_display = ['customer_name', 'sale', 'number', 'amount_display', 'due_date', 'status', 'paid_date']
    list_filter = ['status']
    search_fields = ['sale__customer__full_name', 'sale__customer__document_number']
    date_hierarchy = 'due_date'
    list_per_page = 25
    actions = ['mark_as_paid']

    def customer_name(self, obj):
        return obj.sale.customer.full_name
    customer_name.short_description = 'Cliente'
    customer_name.admin_order_field = 'sale__customer__full_name'

    def amount_display(self, obj):
        return f'Gs. {obj.amount:,.0f}'.replace(',', '.')
    amount_display.short_description = 'Monto'
    amount_display.admin_order_field = 'amount'

    def mark_as_paid(self, request, queryset):
        for installment in queryset:
            installment.mark_as_paid()
        self.message_user(request, f'{queryset.count()} cuota(s) marcada(s) como pagada(s).')
    mark_as_paid.short_description = 'Marcar cuotas seleccionadas como pagadas'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        today = timezone.now().date()
        qs.filter(status=Installment.STATUS_PENDING, due_date__lt=today).update(status=Installment.STATUS_OVERDUE)
        return qs


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'product', 'movement_type', 'quantity', 'resulting_stock', 'reason']
    list_filter = ['movement_type']
    search_fields = ['product__name', 'reason']
    date_hierarchy = 'created_at'
    list_per_page = 25

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'user', 'action', 'model_name', 'object_repr', 'description']
    list_filter = ['action', 'model_name']
    search_fields = ['user__username', 'object_repr', 'description']
    date_hierarchy = 'created_at'
    list_per_page = 40

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['expense_date', 'category', 'amount_display', 'description']
    list_filter = ['category']
    search_fields = ['description']
    date_hierarchy = 'expense_date'
    list_per_page = 25

    def amount_display(self, obj):
        return f'Gs. {obj.amount:,.0f}'.replace(',', '.')
    amount_display.short_description = 'Monto'
    amount_display.admin_order_field = 'amount'
