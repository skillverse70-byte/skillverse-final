from apps.audit.models import AuditLog


def record_audit_log(*, actor, action, target_type, target_id, summary, metadata=None):
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=target_id,
        summary=summary,
        metadata=metadata or {},
    )
