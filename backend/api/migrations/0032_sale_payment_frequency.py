from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0031_sale_first_due_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='sale',
            name='payment_frequency',
            field=models.CharField(
                choices=[('MONTHLY', 'Mensual'), ('WEEKLY', 'Semanal')],
                default='MONTHLY', max_length=10, verbose_name='Frecuencia de Cuotas',
            ),
        ),
    ]
