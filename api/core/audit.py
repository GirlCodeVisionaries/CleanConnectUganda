"""Helper for recording platform-admin actions to AdminActionLog."""
from .models import AdminActionLog


def _client_ip(request):
    if not request:
        return None
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_admin_action(*, actor, action, target=None, target_type='', target_id='',
                     summary='', detail=None, request=None):
    if target is not None and not target_type:
        target_type = target.__class__.__name__.lower()
    if target is not None and not target_id:
        target_id = str(getattr(target, 'pk', ''))
    return AdminActionLog.objects.create(
        actor=actor if (actor and actor.is_authenticated) else None,
        action=action,
        target_type=target_type,
        target_id=str(target_id),
        summary=summary,
        detail=detail,
        ip_address=_client_ip(request),
    )
