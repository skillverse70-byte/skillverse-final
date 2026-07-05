from rest_framework.permissions import BasePermission

from apps.common.enums import Role

LEGACY_ROLE_ALIASES = {
    "user": Role.REGULAR_USER,
    "regular_user": Role.REGULAR_USER,
    "organization": Role.ORGANIZATION,
    "org": Role.ORGANIZATION,
    "admin": Role.ADMIN,
}


def normalize_actor_role(user_or_role):
    if user_or_role is None:
        return Role.GUEST

    if isinstance(user_or_role, str):
        return LEGACY_ROLE_ALIASES.get(user_or_role.lower(), user_or_role.lower())

    role = getattr(user_or_role, "role", None)
    if role:
        return normalize_actor_role(role)

    is_staff = getattr(user_or_role, "is_staff", False)
    is_superuser = getattr(user_or_role, "is_superuser", False)
    if is_staff or is_superuser:
        return Role.ADMIN

    is_authenticated = getattr(user_or_role, "is_authenticated", False)
    if is_authenticated:
        return Role.REGULAR_USER

    return Role.GUEST


def user_has_any_role(user, allowed_roles):
    normalized_role = normalize_actor_role(user)
    normalized_allowed_roles = {
        normalize_actor_role(role)
        for role in allowed_roles
    }
    return normalized_role in normalized_allowed_roles


class HasActorRole(BasePermission):
    allowed_roles = tuple()

    def has_permission(self, request, view):
        return user_has_any_role(request.user, self.allowed_roles)


class IsRegularUser(HasActorRole):
    allowed_roles = (Role.REGULAR_USER,)


class IsOrganizationActor(HasActorRole):
    allowed_roles = (Role.ORGANIZATION,)


class IsAdminActor(HasActorRole):
    allowed_roles = (Role.ADMIN,)


class IsRegularUserOrAdmin(HasActorRole):
    allowed_roles = (Role.REGULAR_USER, Role.ADMIN)


class IsOrganizationActorOrAdmin(HasActorRole):
    allowed_roles = (Role.ORGANIZATION, Role.ADMIN)
