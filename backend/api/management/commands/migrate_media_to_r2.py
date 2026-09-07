import os
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from api.models import Product, ProductImage, CompanyInfo


class Command(BaseCommand):
    help = 'Sube a R2 (u otro storage remoto configurado) las imágenes que todavía están solo en el disco local, sin tocar las que ya fueron migradas.'

    def handle(self, *args, **options):
        local_media_root = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'media')

        fields_to_migrate = [
            (Product.objects.exclude(image='').filter(image__isnull=False), 'image'),
            (ProductImage.objects.exclude(image='').filter(image__isnull=False), 'image'),
            (CompanyInfo.objects.exclude(logo='').filter(logo__isnull=False), 'logo'),
        ]

        migrated = 0
        skipped = 0
        missing = 0

        for queryset, field_name in fields_to_migrate:
            for instance in queryset:
                field_file = getattr(instance, field_name)
                name = field_file.name

                if default_storage.exists(name):
                    self.stdout.write(f'Ya existe en el storage actual, se omite: {name}')
                    skipped += 1
                    continue

                local_path = os.path.join(local_media_root, name)
                if not os.path.exists(local_path):
                    self.stdout.write(self.style.WARNING(f'No se encontró el archivo local, se omite: {local_path}'))
                    missing += 1
                    continue

                with open(local_path, 'rb') as f:
                    default_storage.save(name, ContentFile(f.read()))

                self.stdout.write(self.style.SUCCESS(f'Subido: {name}'))
                migrated += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nListo. Subidas: {migrated} | Ya existían: {skipped} | No encontradas localmente: {missing}'
        ))
