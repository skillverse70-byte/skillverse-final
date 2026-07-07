from rest_framework.permissions import BasePermission

from apps.common.enums import Role
from apps.common.permissions import user_has_any_role


class IsPaymentActor(BasePermission):
    def has_permission(self, request, view):
        return user_has_any_role(request.user, (Role.REGULAR_USER, Role.ORGANIZATION))
