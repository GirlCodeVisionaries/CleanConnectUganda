from rest_framework.permissions import BasePermission


class IsPartner(BasePermission):
    """Authenticated user who has a partner profile (or the 'partner' role)."""
    message = 'A partner account is required for this action.'

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.role == 'partner' or hasattr(user, 'partner_profile')
