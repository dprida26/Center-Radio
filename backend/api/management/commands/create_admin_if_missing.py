import os
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Crea el superusuario admin si todavía no existe, usando ADMIN_USERNAME/ADMIN_PASSWORD del entorno.'

    def handle(self, *args, **options):
        User = get_user_model()
        username = os.environ.get('ADMIN_USERNAME')
        password = os.environ.get('ADMIN_PASSWORD')

        if not username or not password:
            self.stdout.write('ADMIN_USERNAME/ADMIN_PASSWORD no configurados, se omite la creación del admin.')
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(f'El usuario "{username}" ya existe, no se crea de nuevo.')
            return

        User.objects.create_superuser(username=username, password=password)
        self.stdout.write(self.style.SUCCESS(f'Superusuario "{username}" creado correctamente.'))
