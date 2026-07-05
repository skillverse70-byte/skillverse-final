from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import RegularUserProfile
from apps.common.enums import ExperienceLevel, MatchSuggestionType, Role, SkillDirection
from apps.skills.models import FieldInterest, Skill, UserFieldInterest, UserSkill
from apps.swaps.models import MatchSuggestion

User = get_user_model()


class MatchSuggestionApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.current_user = User.objects.create_user(
            email="matcher@example.com",
            password="StrongPass123!",
            full_name="Matcher User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        RegularUserProfile.objects.create(
            user=self.current_user,
            bio="Loves collaborative learning.",
            interests_summary="Backend, teaching, product building.",
            experience_level=ExperienceLevel.MID_CAREER,
        )

        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": self.current_user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        self.python_skill = Skill.objects.create(name="Python", slug="python")
        self.design_skill = Skill.objects.create(name="Design", slug="design")
        self.react_skill = Skill.objects.create(name="React", slug="react")
        self.writing_skill = Skill.objects.create(name="Writing", slug="writing")
        self.field_cs = FieldInterest.objects.create(name="Computer Science", slug="computer-science")
        self.field_design = FieldInterest.objects.create(name="Design", slug="design-field")

        UserSkill.objects.create(
            user=self.current_user,
            skill=self.python_skill,
            direction=SkillDirection.OFFERING,
        )
        UserSkill.objects.create(
            user=self.current_user,
            skill=self.design_skill,
            direction=SkillDirection.REQUESTING,
        )
        UserFieldInterest.objects.create(
            user=self.current_user,
            field_interest=self.field_cs,
        )

    def _create_regular_user(self, email, full_name, experience_level=ExperienceLevel.EARLY_CAREER):
        user = User.objects.create_user(
            email=email,
            password="StrongPass123!",
            full_name=full_name,
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        RegularUserProfile.objects.create(
            user=user,
            bio=f"{full_name} bio",
            interests_summary=f"{full_name} interests",
            experience_level=experience_level,
        )
        return user

    def test_match_suggestions_prioritize_direct_and_explain_rationale(self):
        direct_match = self._create_regular_user("direct@example.com", "Direct Match")
        partial_match = self._create_regular_user("partial@example.com", "Partial Match")
        field_match = self._create_regular_user("field@example.com", "Field Match")
        organization_user = User.objects.create_user(
            email="org@example.com",
            password="StrongPass123!",
            full_name="Org Actor",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-05T00:00:00Z",
        )

        UserSkill.objects.create(
            user=direct_match,
            skill=self.design_skill,
            direction=SkillDirection.OFFERING,
        )
        UserSkill.objects.create(
            user=direct_match,
            skill=self.python_skill,
            direction=SkillDirection.REQUESTING,
        )
        UserFieldInterest.objects.create(user=direct_match, field_interest=self.field_cs)

        UserSkill.objects.create(
            user=partial_match,
            skill=self.design_skill,
            direction=SkillDirection.OFFERING,
        )
        UserFieldInterest.objects.create(user=partial_match, field_interest=self.field_cs)

        UserSkill.objects.create(
            user=field_match,
            skill=self.writing_skill,
            direction=SkillDirection.OFFERING,
        )
        UserFieldInterest.objects.create(user=field_match, field_interest=self.field_cs)

        UserSkill.objects.create(
            user=organization_user,
            skill=self.design_skill,
            direction=SkillDirection.OFFERING,
        )

        # Align current user with a shared-skill-interest candidate for field-relevant matching.
        UserSkill.objects.create(
            user=self.current_user,
            skill=self.writing_skill,
            direction=SkillDirection.OFFERING,
        )

        response = self.client.get(reverse("match-suggestions"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(response.data[0]["suggestion_type"], MatchSuggestionType.DIRECT_SWAP)
        self.assertEqual(response.data[0]["target_user"]["full_name"], "Direct Match")
        self.assertIn("learn Design", response.data[0]["rationale"])
        self.assertIn("teach Python", response.data[0]["rationale"])

        suggestion_types = {item["target_user"]["full_name"]: item["suggestion_type"] for item in response.data}
        self.assertEqual(suggestion_types["Partial Match"], MatchSuggestionType.PARTIAL_OVERLAP)
        self.assertEqual(suggestion_types["Field Match"], MatchSuggestionType.FIELD_RELEVANT)
        self.assertFalse(any(item["target_user"]["full_name"] == "Org Actor" for item in response.data))
        self.assertEqual(MatchSuggestion.objects.filter(source_user=self.current_user).count(), 3)

    def test_match_suggestions_require_regular_user_actor(self):
        self.client.credentials()
        org_user = User.objects.create_user(
            email="org-actor@example.com",
            password="StrongPass123!",
            full_name="Org Actor",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": org_user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        response = self.client.get(reverse("match-suggestions"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_match_suggestions_return_empty_for_users_without_overlap(self):
        unrelated_user = self._create_regular_user("unrelated@example.com", "Unrelated User")
        UserSkill.objects.create(
            user=unrelated_user,
            skill=self.writing_skill,
            direction=SkillDirection.OFFERING,
        )
        UserFieldInterest.objects.create(
            user=unrelated_user,
            field_interest=self.field_design,
        )

        response = self.client.get(reverse("match-suggestions"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
