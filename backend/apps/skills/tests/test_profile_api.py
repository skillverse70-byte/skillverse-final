from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework.settings import api_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.enums import ExperienceLevel, Role, SkillDirection
from apps.skills.models import FieldInterest, Skill, UserSkill

User = get_user_model()


class RegularUserProfileApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.user = User.objects.create_user(
            email="profile@example.com",
            password="StrongPass123!",
            full_name="Profile User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": self.user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

    def test_regular_user_can_create_and_update_private_profile(self):
        update_response = self.client.put(
            reverse("profile-me"),
            {
                "full_name": "Updated User",
                "bio": "Learning by teaching.",
                "interests_summary": "Design, mentoring, community.",
                "experience_level": ExperienceLevel.EARLY_CAREER,
            },
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Updated User")
        self.assertEqual(update_response.data["bio"], "Learning by teaching.")
        self.assertEqual(
            update_response.data["experience_level"],
            ExperienceLevel.EARLY_CAREER,
        )

    def test_regular_user_can_add_and_remove_field_interest(self):
        create_response = self.client.post(
            reverse("profile-fields"),
            {"name": "Computer Science"},
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        relation_id = create_response.data["id"]
        self.assertEqual(
            create_response.data["field_interest"]["name"],
            "Computer Science",
        )

        catalog_response = self.client.get(reverse("fields-catalog"))
        self.assertEqual(catalog_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(catalog_response.data), 1)

        delete_response = self.client.delete(reverse("profile-field-detail", args=[relation_id]))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_regular_user_can_add_update_and_remove_skill(self):
        create_response = self.client.post(
            reverse("profile-skills"),
            {
                "name": "Python",
                "direction": SkillDirection.OFFERING,
                "experience_note": "Three years building web apps.",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        user_skill_id = create_response.data["id"]
        self.assertEqual(create_response.data["skill"]["name"], "Python")

        patch_response = self.client.patch(
            reverse("profile-skill-detail", args=[user_skill_id]),
            {
                "direction": SkillDirection.BOTH,
                "experience_note": "Can teach and still want to deepen it.",
            },
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["direction"], SkillDirection.BOTH)

        delete_response = self.client.delete(
            reverse("profile-skill-detail", args=[user_skill_id])
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_profile_surface_is_private_to_authenticated_non_org_actors(self):
        self.client.credentials()
        guest_response = self.client.get(reverse("profile-me"))
        self.assertEqual(guest_response.status_code, status.HTTP_403_FORBIDDEN)

        organization_user = User.objects.create_user(
            email="org-private@example.com",
            password="StrongPass123!",
            full_name="Org Private",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        org_login = self.client.post(
            reverse("token_obtain_pair"),
            {"email": organization_user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {org_login.data['access']}")
        org_response = self.client.get(reverse("profile-me"))
        self.assertEqual(org_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_skill_is_rejected(self):
        Skill.objects.create(name="Public Speaking", slug="public-speaking")
        UserSkill.objects.create(
            user=self.user,
            skill=Skill.objects.get(slug="public-speaking"),
            direction=SkillDirection.REQUESTING,
        )

        response = self.client.post(
            reverse("profile-skills"),
            {
                "skill_id": Skill.objects.get(slug="public-speaking").id,
                "direction": SkillDirection.OFFERING,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already", str(response.data).lower())

    @override_settings(ENABLE_AUTH_THROTTLING=True)
    def test_profile_endpoints_do_not_share_auth_throttle_bucket(self):
        auth_limit = int(
            str(api_settings.DEFAULT_THROTTLE_RATES["auth"]).split("/", maxsplit=1)[0]
        )

        for _ in range(auth_limit):
            response = self.client.get(reverse("auth-me"))
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        throttled_auth_response = self.client.get(reverse("auth-me"))
        self.assertEqual(throttled_auth_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        profile_response = self.client.get(reverse("profile-skills"))
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)

        catalog_response = self.client.get(reverse("skills-catalog"))
        self.assertEqual(catalog_response.status_code, status.HTTP_200_OK)
