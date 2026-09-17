from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Installment, PurchaseInstallment


class Command(BaseCommand):
    help = (
        'Sincroniza en la base el status de cuotas vencidas (PENDING -> OVERDUE). '
        'El panel ya calcula "vencida" al vuelo sin depender de esto, asi que este '
        'comando es solo para que el campo status quede consistente en el admin y '
        'en consultas directas a la base. Pensado para correr periodicamente '
        '(ej. una vez por deploy o via cron), NUNCA en cada request.'
    )

    def handle(self, *args, **options):
        today = timezone.now().date()

        customer_updated = Installment.objects.filter(
            status=Installment.STATUS_PENDING, due_date__lt=today,
        ).update(status=Installment.STATUS_OVERDUE)

        supplier_updated = PurchaseInstallment.objects.filter(
            status=PurchaseInstallment.STATUS_PENDING, due_date__lt=today,
        ).update(status=PurchaseInstallment.STATUS_OVERDUE)

        self.stdout.write(self.style.SUCCESS(
            f'Cuotas de clientes marcadas como vencidas: {customer_updated}. '
            f'Cuotas de proveedores marcadas como vencidas: {supplier_updated}.'
        ))
