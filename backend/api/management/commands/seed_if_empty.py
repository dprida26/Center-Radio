from django.core.management import call_command
from django.core.management.base import BaseCommand
from api.models import Category


class Command(BaseCommand):
    help = 'Carga los datos iniciales (fixtures/seed_data.json) solo si la base de datos está vacía.'

    def handle(self, *args, **options):
        if Category.objects.exists():
            self.stdout.write('La base de datos ya tiene datos, se omite la carga inicial.')
            return

        self.stdout.write('Base de datos vacía, cargando datos iniciales...')
        call_command('loaddata', 'seed_data')
        self.stdout.write(self.style.SUCCESS('Datos iniciales cargados correctamente.'))
