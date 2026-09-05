from .models import AuditLog

TRACKED_FIELDS_MAX_LEN = 200


def _serialize_value(value):
    if value is None:
        return None
    return str(value)[:TRACKED_FIELDS_MAX_LEN]


def log_action(user, action, instance, description='', changes=None):
    AuditLog.objects.create(
        user=user if (user and user.is_authenticated) else None,
        action=action,
        model_name=instance.__class__.__name__,
        object_id=str(getattr(instance, 'pk', '') or ''),
        object_repr=str(instance)[:255],
        description=description[:255],
        changes=changes,
    )


def diff_fields(before, after, fields):
    changes = {}
    for field in fields:
        old_value = _serialize_value(before.get(field))
        new_value = _serialize_value(after.get(field))
        if old_value != new_value:
            changes[field] = {'before': old_value, 'after': new_value}
    return changes


class AuditMixin:
    """Mixin for DRF ModelViewSets: logs CREATE/UPDATE/DELETE automatically.

    Set `audit_fields` (list of field names) on the ViewSet to capture
    before/after diffs on update; omit it to skip diffing (only logs that
    an update happened).
    """
    audit_fields = None

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, AuditLog.ACTION_CREATE, instance)

    def perform_update(self, serializer):
        before = {}
        if self.audit_fields:
            before = {f: getattr(serializer.instance, f, None) for f in self.audit_fields}
        instance = serializer.save()
        changes = None
        if self.audit_fields:
            after = {f: getattr(instance, f, None) for f in self.audit_fields}
            changes = diff_fields(before, after, self.audit_fields) or None
        log_action(self.request.user, AuditLog.ACTION_UPDATE, instance, changes=changes)

    def perform_destroy(self, instance):
        log_action(self.request.user, AuditLog.ACTION_DELETE, instance)
        instance.delete()
