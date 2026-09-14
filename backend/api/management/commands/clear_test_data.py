from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import (
    AuditLog, Customer, Expense, Installment, Order, OrderItem, PurchaseInstallment,
    PurchaseInvoice, PurchaseInvoiceItem, Sale, StockMovement, Supplier,
)


class Command(BaseCommand):
    help = (
        'Borra los datos transaccionales de prueba (clientes, proveedores, ventas, compras, '
        'pedidos, gastos, cuotas, movimientos de stock y log de auditoría), conservando '
        'Category, Product/ProductImage, Promotion y CompanyInfo.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes', action='store_true',
            help='Confirma el borrado sin pedir confirmación interactiva.',
        )

    def handle(self, *args, **options):
        counts = {
            'Cuotas de clientes': Installment.objects.count(),
            'Cuotas a proveedores': PurchaseInstallment.objects.count(),
            'Items de pedidos web': OrderItem.objects.count(),
            'Pedidos web': Order.objects.count(),
            'Ventas': Sale.objects.count(),
            'Items de compras': PurchaseInvoiceItem.objects.count(),
            'Compras a proveedores': PurchaseInvoice.objects.count(),
            'Movimientos de stock': StockMovement.objects.count(),
            'Gastos': Expense.objects.count(),
            'Log de auditoría': AuditLog.objects.count(),
            'Clientes': Customer.objects.count(),
            'Proveedores': Supplier.objects.count(),
        }

        self.stdout.write('Se van a borrar los siguientes datos:')
        for label, count in counts.items():
            self.stdout.write(f'  - {label}: {count}')
        self.stdout.write(self.style.WARNING(
            '\nSe conservan: Categorías, Productos/Imágenes, Promociones e Información de la empresa.'
        ))

        if not options['yes']:
            answer = input('\n¿Confirmás el borrado? Esta acción no se puede deshacer. (escribí "si" para continuar): ')
            if answer.strip().lower() not in ('si', 'sí', 'yes'):
                self.stdout.write(self.style.ERROR('Cancelado, no se borró nada.'))
                return

        with transaction.atomic():
            Installment.objects.all().delete()
            PurchaseInstallment.objects.all().delete()
            OrderItem.objects.all().delete()
            Order.objects.all().delete()
            Sale.objects.all().delete()
            PurchaseInvoiceItem.objects.all().delete()
            PurchaseInvoice.objects.all().delete()
            StockMovement.objects.all().delete()
            Expense.objects.all().delete()
            AuditLog.objects.all().delete()
            Customer.objects.all().delete()
            Supplier.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('\nListo. Se borraron los datos de prueba y se conservó el catálogo.'))
