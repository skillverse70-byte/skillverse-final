from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import RegularUserProfile
from apps.common.enums import (
    CourseProgramStatus,
    EventStatus,
    OpportunityStatus,
    OrganizationType,
    Role,
    SkillDirection,
)
from apps.courses.models import CourseProgram, Enrollment
from apps.events.models import Event
from apps.opportunities.models import Opportunity
from apps.organizations.models import Organization
from apps.skills.models import FieldInterest, Skill, UserFieldInterest, UserSkill

User = get_user_model()


class AIRecommendationFeedApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.admin_user = User.objects.create_user(
            email="admin-rec@example.com",
            password="StrongPass123!",
            full_name="Admin Reviewer",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.organization_owner = User.objects.create_user(
            email="org-rec@example.com",
            password="StrongPass123!",
            full_name="Org Owner",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.regular_user = User.objects.create_user(
            email="learner@example.com",
            password="StrongPass123!",
            full_name="Learner One",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.peer_user = User.objects.create_user(
            email="peer@example.com",
            password="StrongPass123!",
            full_name="Peer Match",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.unrelated_user = User.objects.create_user(
            email="other@example.com",
            password="StrongPass123!",
            full_name="Other Learner",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_owner,
            name="SkillVerse Academy",
            type=OrganizationType.COMPANY,
            description="Learning org",
            contact_email="org@example.com",
        )

        RegularUserProfile.objects.create(
            user=self.regular_user,
            bio="I am into product and design.",
            interests_summary="Product design and collaboration",
            experience_level="student",
        )
        RegularUserProfile.objects.create(
            user=self.peer_user,
            bio="I teach design and want python help.",
            interests_summary="Design systems and prototyping",
            experience_level="mid_career",
        )
        RegularUserProfile.objects.create(
            user=self.unrelated_user,
            bio="Other learner",
            interests_summary="General learning",
            experience_level="student",
        )

        product_field = FieldInterest.objects.create(name="Product", slug="product")
        design_skill = Skill.objects.create(name="Design", slug="design")
        python_skill = Skill.objects.create(name="Python", slug="python")
        facilitation_skill = Skill.objects.create(name="Facilitation", slug="facilitation")

        UserFieldInterest.objects.create(user=self.regular_user, field_interest=product_field)
        UserFieldInterest.objects.create(user=self.peer_user, field_interest=product_field)

        UserSkill.objects.create(
            user=self.regular_user,
            skill=python_skill,
            direction=SkillDirection.OFFERING,
        )
        UserSkill.objects.create(
            user=self.regular_user,
            skill=design_skill,
            direction=SkillDirection.REQUESTING,
        )
        UserSkill.objects.create(
            user=self.peer_user,
            skill=design_skill,
            direction=SkillDirection.OFFERING,
        )
        UserSkill.objects.create(
            user=self.peer_user,
            skill=python_skill,
            direction=SkillDirection.REQUESTING,
        )
        UserSkill.objects.create(
            user=self.peer_user,
            skill=facilitation_skill,
            direction=SkillDirection.OFFERING,
        )

        self.course = CourseProgram.objects.create(
            organization=self.organization,
            title="Product Design Foundations",
            description="Intro course",
            category="Product",
            tags=["Design", "Research"],
            status=CourseProgramStatus.PUBLISHED,
            is_free=True,
        )
        Enrollment.objects.create(
            user=self.regular_user,
            course_program=self.course,
            status="active",
        )
        self.recommended_course = CourseProgram.objects.create(
            organization=self.organization,
            title="Advanced Product Research",
            description="Deep dive",
            category="Product",
            tags=["Research", "Design Thinking"],
            status=CourseProgramStatus.PUBLISHED,
            is_free=True,
        )
        self.event = Event.objects.create(
            organization=self.organization,
            title="Design Jam",
            description="Design event",
            category="Workshop",
            location="Addis Ababa",
            is_online=False,
            status=EventStatus.UPCOMING,
            starts_at=timezone.now() + timedelta(days=3),
            field_signals=["Product"],
            related_skills=["Design Thinking"],
            related_course_ids=[self.course.id],
            participation_signals=["event_attendance"],
        )
        self.opportunity = Opportunity.objects.create(
            organization=self.organization,
            title="Junior Product Designer",
            description="Great role",
            status=OpportunityStatus.OPEN,
            category="Product",
            field_signals=["Product"],
            required_skills=["Design", "Facilitation"],
            related_course_ids=[self.course.id],
            verified_activity_signals=["event_attendance"],
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_regular_user_receives_fallback_recommendations(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("ai-recommendation-feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["target_user"]["id"], self.regular_user.id)
        self.assertFalse(response.data["used_ai"])
        self.assertGreaterEqual(len(response.data["peer_matches"]), 1)
        self.assertGreaterEqual(len(response.data["skill_recommendations"]), 1)
        self.assertGreaterEqual(len(response.data["course_recommendations"]), 1)
        self.assertGreaterEqual(len(response.data["event_recommendations"]), 1)
        self.assertGreaterEqual(len(response.data["opportunity_recommendations"]), 1)

    def test_admin_can_inspect_regular_user_recommendations(self):
        self.authenticate(self.admin_user)

        response = self.client.get(
            reverse("ai-recommendation-feed"),
            {"user_id": self.regular_user.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["actor_role"], Role.ADMIN)
        self.assertEqual(response.data["target_user"]["id"], self.regular_user.id)

    def test_organization_can_only_inspect_related_regular_users(self):
        self.authenticate(self.organization_owner)

        related_response = self.client.get(
            reverse("ai-recommendation-feed"),
            {"user_id": self.regular_user.id},
        )
        unrelated_response = self.client.get(
            reverse("ai-recommendation-feed"),
            {"user_id": self.unrelated_user.id},
        )

        self.assertEqual(related_response.status_code, status.HTTP_200_OK)
        self.assertEqual(unrelated_response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(
        AI_FEATURES_ENABLED=True,
        AI_RECOMMENDATIONS_ENABLED=True,
        OPENROUTER_API_KEY="test-key",
    )
    @patch("apps.ai.recommendations.get_default_ai_provider")
    def test_ai_ready_mode_can_override_rationales(self, mock_get_provider):
        provider = mock_get_provider.return_value
        provider.configuration.return_value = {
            "provider": "openrouter",
            "configured": True,
            "healthy": True,
            "default_model": "google/gemma-3n-e4b-it:free",
            "base_url": "https://openrouter.ai",
            "timeout_seconds": 20,
            "has_api_key": True,
            "using_legacy_env_key": False,
            "feature_flags": {
                "ai_features_enabled": True,
                "ai_recommendations_enabled": True,
            },
        }
        provider.create_chat_completion.return_value = {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"skill_recommendations":{"design-thinking":"AI says this skill closes the gap between your '
                            'course activity and event opportunities."},"course_recommendations":{},'
                            '"event_recommendations":{},"opportunity_recommendations":{},'
                            '"peer_matches":{}}'
                        )
                    }
                }
            ]
        }
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("ai-recommendation-feed"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["used_ai"])
        self.assertEqual(response.data["rollout_state"], "ready")
        self.assertTrue(
            any(item["used_ai"] for item in response.data["skill_recommendations"])
        )
