from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.common.enums import Role
from apps.common.permissions import (
    IsAdminActor,
    IsOrganizationActor,
    IsOrganizationActorOrAdmin,
    IsRegularUserOrAdmin,
    normalize_actor_role,
    user_has_any_role,
)


class PermissionContractTests(SimpleTestCase):
    def test_normalize_actor_role_handles_legacy_aliases(self):
        self.assertEqual(normalize_actor_role("user"), Role.REGULAR_USER)
        self.assertEqual(normalize_actor_role("admin"), Role.ADMIN)
        self.assertEqual(normalize_actor_role("org"), Role.ORGANIZATION)

    def test_normalize_actor_role_handles_user_like_objects(self):
        admin_user = SimpleNamespace(role="admin")
        regular_user = SimpleNamespace(role="user")
        anonymous_user = SimpleNamespace(is_authenticated=False)

        self.assertEqual(normalize_actor_role(admin_user), Role.ADMIN)
        self.assertEqual(normalize_actor_role(regular_user), Role.REGULAR_USER)
        self.assertEqual(normalize_actor_role(anonymous_user), Role.GUEST)

    def test_user_has_any_role_accepts_normalized_matches(self):
        org_user = SimpleNamespace(role="organization")
        self.assertTrue(user_has_any_role(org_user, [Role.ORGANIZATION]))
        self.assertFalse(user_has_any_role(org_user, [Role.ADMIN]))

    def test_normalize_actor_role_treats_staff_without_explicit_role_as_admin(self):
        staff_user = SimpleNamespace(
            role=None,
            is_staff=True,
            is_superuser=False,
            is_authenticated=True,
        )

        self.assertEqual(normalize_actor_role(staff_user), Role.ADMIN)

    def test_permission_classes_respect_allowed_roles(self):
        request = SimpleNamespace(user=SimpleNamespace(role="admin"))

        self.assertTrue(IsAdminActor().has_permission(request, None))
        self.assertFalse(IsOrganizationActor().has_permission(request, None))
        self.assertTrue(IsRegularUserOrAdmin().has_permission(request, None))

    def test_organization_or_admin_permission_accepts_org_and_admin_only(self):
        org_request = SimpleNamespace(user=SimpleNamespace(role="organization"))
        admin_request = SimpleNamespace(user=SimpleNamespace(role="admin"))
        user_request = SimpleNamespace(user=SimpleNamespace(role="user"))

        permission = IsOrganizationActorOrAdmin()

        self.assertTrue(permission.has_permission(org_request, None))
        self.assertTrue(permission.has_permission(admin_request, None))
        self.assertFalse(permission.has_permission(user_request, None))
