import json
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Category, Customer, Installment, Product, Sale, SaleItem


PRODUCT_NAME = 'Migración - Histórico'
CATEGORY_NAME = 'Migración'
MAX_MONTO = Decimal('9999999999.99')  # límite real de DecimalField(max_digits=12, decimal_places=2)


def to_decimal(value):
    if value is None:
        return None
    return Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class Command(BaseCommand):
    help = (
        'Importa clientes, ventas y cuotas desde el JSON generado por '
        'scripts/parse_ctacte.py (reporte de cuenta corriente del sistema legado). '
        'Por defecto corre en modo --dry-run (no escribe nada en la base).'
    )

    def add_arguments(self, parser):
        parser.add_argument('json_path', type=str, help='Ruta al JSON generado por parse_ctacte.py')
        parser.add_argument(
            '--commit', action='store_true',
            help='Escribe los cambios en la base. Sin esta bandera solo se simula (dry-run).',
        )

    def handle(self, *args, **options):
        path = options['json_path']
        try:
            with open(path, encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            raise CommandError(f'No se encontró el archivo: {path}')

        clientes = data['clientes']
        dry_run = not options['commit']

        stats = {
            'clientes_nuevos': 0,
            'clientes_existentes': 0,
            'ventas_creadas': 0,
            'cuotas_creadas': 0,
            'clientes_omitidos_sin_ci': 0,
            'ci_duplicado_distinto_nombre': [],
            'ventas_omitidas_monto_invalido': [],
        }

        product = None
        if not dry_run:
            category, _ = Category.objects.get_or_create(
                name=CATEGORY_NAME,
                defaults={'description': 'Categoría técnica para ventas históricas migradas.'},
            )
            product, _ = Product.objects.get_or_create(
                name=PRODUCT_NAME,
                defaults={
                    'description': 'Producto genérico usado para representar ventas a cuotas migradas del sistema contable legado, sin detalle de artículo original.',
                    'price': 0,
                    'category': category,
                    'is_active': False,
                },
            )

        # una sola query para traer todos los clientes existentes por CI,
        # en vez de una query por cliente (crítico con latencia de red alta)
        docs_csv = {(c['document_number'] or '').strip() for c in clientes if (c['document_number'] or '').strip()}
        existentes = {
            cust.document_number: cust
            for cust in Customer.objects.filter(document_number__in=docs_csv)
        }

        with transaction.atomic():
            sid = transaction.savepoint()

            nuevos_customers = []
            ventas_a_crear = []  # lista de (doc, sale_kwargs, installments_data)

            for c in clientes:
                doc = (c['document_number'] or '').strip()
                nombre = (c['full_name'] or '').strip()

                if not doc:
                    stats['clientes_omitidos_sin_ci'] += 1
                    continue

                existing = existentes.get(doc)
                if existing and existing.full_name.strip().upper() != nombre.upper():
                    stats['ci_duplicado_distinto_nombre'].append({
                        'document_number': doc,
                        'nombre_csv': nombre,
                        'nombre_existente': existing.full_name,
                    })

                if existing:
                    stats['clientes_existentes'] += 1
                else:
                    stats['clientes_nuevos'] += 1
                    nuevo = Customer(document_number=doc, full_name=nombre)
                    existentes[doc] = nuevo  # evita duplicados si el mismo CI se repite en el propio archivo
                    if not dry_run:
                        nuevos_customers.append(nuevo)

                for s in c['sales']:
                    installment_count = s['installment_count']
                    unit_price = to_decimal(s['total_amount'])
                    montos_cuotas = [to_decimal(ins['amount']) for ins in s['installments']]

                    if unit_price > MAX_MONTO or any(m > MAX_MONTO for m in montos_cuotas if m is not None):
                        stats['ventas_omitidas_monto_invalido'].append({
                            'document_number': doc,
                            'nombre': nombre,
                            'comprobante': s['comprobante'],
                            'monto': str(unit_price),
                        })
                        continue

                    stats['ventas_creadas'] += 1
                    stats['cuotas_creadas'] += len(s['installments'])

                    if not dry_run:
                        ventas_a_crear.append((doc, s, unit_price, installment_count))

            if not dry_run:
                # bulk_create de clientes nuevos, luego releer para tener sus IDs
                if nuevos_customers:
                    Customer.objects.bulk_create(nuevos_customers)
                todos_customers = {
                    cust.document_number: cust
                    for cust in Customer.objects.filter(document_number__in=docs_csv)
                }

                sales_objs = []
                sales_meta = []  # (unit_price, installments_data) alineado con sales_objs
                for doc, s, unit_price, installment_count in ventas_a_crear:
                    sales_objs.append(Sale(
                        customer=todos_customers[doc],
                        payment_type=Sale.PAYMENT_INSTALLMENTS,
                        installment_count=installment_count,
                        interest_rate=0,
                        sale_date=s['sale_date'],
                        notes=f"Migrado desde sistema legado — comprobante {s['comprobante']}",
                    ))
                    sales_meta.append((unit_price, s['installments']))

                created_sales = Sale.objects.bulk_create(sales_objs)

                SaleItem.objects.bulk_create([
                    SaleItem(sale=sale, product=product, quantity=1, unit_price=unit_price)
                    for sale, (unit_price, _) in zip(created_sales, sales_meta)
                ])

                installment_objs = []
                for sale, (_, installments) in zip(created_sales, sales_meta):
                    for ins in installments:
                        installment_objs.append(Installment(
                            sale=sale,
                            number=ins['number'],
                            amount=to_decimal(ins['amount']),
                            due_date=ins['due_date'],
                            status=ins['status'],
                            paid_date=ins['paid_date'],
                            paid_amount=to_decimal(ins['paid_amount']),
                        ))
                Installment.objects.bulk_create(installment_objs, batch_size=1000)

            if dry_run:
                transaction.savepoint_rollback(sid)
            else:
                transaction.savepoint_commit(sid)

        self.stdout.write(self.style.WARNING('MODO DRY-RUN (no se escribió nada)') if dry_run else self.style.SUCCESS('IMPORTADO A LA BASE'))
        self.stdout.write(f"Clientes nuevos: {stats['clientes_nuevos']}")
        self.stdout.write(f"Clientes ya existentes (se reutilizan por CI): {stats['clientes_existentes']}")
        self.stdout.write(f"Ventas {'a crear' if dry_run else 'creadas'}: {stats['ventas_creadas']}")
        self.stdout.write(f"Cuotas {'a crear' if dry_run else 'creadas'}: {stats['cuotas_creadas']}")
        self.stdout.write(f"Clientes omitidos por no tener CI: {stats['clientes_omitidos_sin_ci']}")

        montos_invalidos = stats['ventas_omitidas_monto_invalido']
        if montos_invalidos:
            self.stdout.write(self.style.ERROR(f"\nVentas omitidas por monto fuera de rango del sistema ({len(montos_invalidos)} casos, cargar a mano con el monto correcto):"))
            for v in montos_invalidos:
                self.stdout.write(f"  CI {v['document_number']} ({v['nombre']}) — {v['comprobante']}: Gs. {v['monto']}")

        dup = stats['ci_duplicado_distinto_nombre']
        if dup:
            self.stdout.write(self.style.ERROR(f"\nCI ya existente en la base pero con nombre distinto ({len(dup)} casos):"))
            for d in dup[:20]:
                self.stdout.write(f"  CI {d['document_number']}: CSV='{d['nombre_csv']}' vs BD='{d['nombre_existente']}'")
            if len(dup) > 20:
                self.stdout.write(f"  ... y {len(dup) - 20} más")

        if dry_run:
            self.stdout.write(self.style.WARNING('\nCorré de nuevo con --commit para aplicar los cambios.'))
