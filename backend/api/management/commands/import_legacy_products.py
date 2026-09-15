import json

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Category, Product


CATEGORY_NAME = 'Sin categorizar'


class Command(BaseCommand):
    help = (
        'Importa productos desde el JSON generado por scripts/parse_inventario.py '
        '(reporte de inventario del sistema legado). Por defecto corre en modo '
        '--dry-run (no escribe nada en la base).'
    )

    def add_arguments(self, parser):
        parser.add_argument('json_path', type=str, help='Ruta al JSON generado por parse_inventario.py')
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

        productos = data['productos']
        dry_run = not options['commit']

        stats = {'productos_creados': 0}

        category = None
        if not dry_run:
            category, _ = Category.objects.get_or_create(
                name=CATEGORY_NAME,
                defaults={'description': 'Categoría técnica para productos migrados del inventario legado, sin clasificar.'},
            )

        with transaction.atomic():
            sid = transaction.savepoint()

            if dry_run:
                stats['productos_creados'] = len(productos)
            else:
                product_objs = [
                    Product(
                        name=p['name'],
                        description=f"Migrado desde inventario legado (código {p['legacy_code']}).",
                        price=0,
                        category=category,
                        stock=p['stock'],
                        is_active=False,
                    )
                    for p in productos
                ]
                Product.objects.bulk_create(product_objs, batch_size=500)
                stats['productos_creados'] = len(product_objs)

            if dry_run:
                transaction.savepoint_rollback(sid)
            else:
                transaction.savepoint_commit(sid)

        self.stdout.write(self.style.WARNING('MODO DRY-RUN (no se escribió nada)') if dry_run else self.style.SUCCESS('IMPORTADO A LA BASE'))
        self.stdout.write(f"Productos {'a crear' if dry_run else 'creados'}: {stats['productos_creados']}")
        self.stdout.write(self.style.WARNING(
            '\nTodos se crean con precio Gs. 0 e inactivos (is_active=False) — '
            'completá precio y activá cada uno desde el panel antes de que aparezcan en la tienda.'
        ))

        if dry_run:
            self.stdout.write(self.style.WARNING('\nCorré de nuevo con --commit para aplicar los cambios.'))
