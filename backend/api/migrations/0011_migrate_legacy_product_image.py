from django.db import migrations


def copy_legacy_images(apps, schema_editor):
    Product = apps.get_model('api', 'Product')
    ProductImage = apps.get_model('api', 'ProductImage')
    for product in Product.objects.exclude(image='').exclude(image__isnull=True):
        ProductImage.objects.create(product=product, image=product.image.name, order=0)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_productimage'),
    ]

    operations = [
        migrations.RunPython(copy_legacy_images, noop_reverse),
    ]
