from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import RegularUserProfile
from apps.common.enums import (
    CourseProgramStatus,
    LessonItemType,
    OrganizationType,
    Role,
    SkillDirection,
)
from apps.courses.models import CourseModule, CourseProgram, Enrollment, EnrollmentLessonProgress, LessonItem
from apps.organizations.models import Organization
from apps.skills.models import FieldInterest, Skill, UserFieldInterest, UserSkill

User = get_user_model()


class AILearningGuidanceApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.admin_user = User.objects.create_user(
            email="admin-guide@example.com",
            password="StrongPass123!",
            full_name="Admin Guide",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.organization_owner = User.objects.create_user(
            email="org-guide@example.com",
            password="StrongPass123!",
            full_name="Org Guide",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.regular_user = User.objects.create_user(
            email="learner-guide@example.com",
            password="StrongPass123!",
            full_name="Learner Guide",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.unrelated_user = User.objects.create_user(
            email="other-guide@example.com",
            password="StrongPass123!",
            full_name="Other Learner",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_owner,
            name="Guidance Academy",
            type=OrganizationType.COMPANY,
            description="Learning org",
            contact_email="guidance@example.com",
        )

        RegularUserProfile.objects.create(
            user=self.regular_user,
            bio="I want to grow into product work.",
            interests_summary="Product and collaboration",
            experience_level="student",
        )
        RegularUserProfile.objects.create(
            user=self.unrelated_user,
            bio="Other learner",
            interests_summary="General learning",
            experience_level="student",
        )

        product_field = FieldInterest.objects.create(name="Product", slug="product-guidance")
        design_skill = Skill.objects.create(name="Design Thinking", slug="design-thinking-guidance")
        research_skill = Skill.objects.create(name="Research", slug="research-guidance")
        python_skill = Skill.objects.create(name="Python", slug="python-guidance")

        UserFieldInterest.objects.create(user=self.regular_user, field_interest=product_field)
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
            user=self.regular_user,
            skill=research_skill,
            direction=SkillDirection.REQUESTING,
        )

        self.course = CourseProgram.objects.create(
            organization=self.organization,
            title="Product Discovery Foundations",
            description="Learn product research and discovery.",
            category="Product",
            tags=["Design Thinking", "Research"],
            status=CourseProgramStatus.PUBLISHED,
            is_free=True,
        )
        module = CourseModule.objects.create(
            course_program=self.course,
            title="Module One",
            description="Start here",
            sort_order=0,
        )
        self.video_lesson = LessonItem.objects.create(
            module=module,
            title="Intro to discovery",
            item_type=LessonItemType.VIDEO,
            description="Overview",
            content_url="https://youtu.be/demo",
            sort_order=0,
        )
        self.assignment_lesson = LessonItem.objects.create(
            module=module,
            title="Discovery brief",
            item_type=LessonItemType.ASSIGNMENT,
            description="Write a short discovery brief.",
            sort_order=1,
        )
        self.quiz_lesson = LessonItem.objects.create(
            module=module,
            title="Research quiz",
            item_type=LessonItemType.QUIZ,
            description="Check your understanding.",
            sort_order=2,
        )
        self.enrollment = Enrollment.objects.create(
            user=self.regular_user,
            course_program=self.course,
            status="active",
            progress_percent=33,
        )
        EnrollmentLessonProgress.objects.create(
            enrollment=self.enrollment,
            lesson_item=self.video_lesson,
            is_completed=True,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_regular_user_receives_fallback_learning_guidance(self):
        self.authenticate(self.regular_user)

        response = self.client.get(
            reverse("ai-learning-guidance"),
            {"course_id": self.course.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["target_user"]["id"], self.regular_user.id)
        self.assertFalse(response.data["used_ai"])
        self.assertEqual(response.data["course_context"]["id"], self.course.id)
        self.assertEqual(response.data["lesson_focus"]["id"], self.assignment_lesson.id)
        self.assertGreaterEqual(len(response.data["skill_gaps"]), 1)
        self.assertGreaterEqual(len(response.data["next_actions"]), 1)
        self.assertGreaterEqual(len(response.data["assignment_feedback"]), 1)

    def test_admin_can_inspect_regular_user_learning_guidance(self):
        self.authenticate(self.admin_user)

        response = self.client.get(
            reverse("ai-learning-guidance"),
            {"user_id": self.regular_user.id, "course_id": self.course.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["actor_role"], Role.ADMIN)
        self.assertEqual(response.data["target_user"]["id"], self.regular_user.id)

    def test_organization_can_only_inspect_related_regular_users(self):
        self.authenticate(self.organization_owner)

        related_response = self.client.get(
            reverse("ai-learning-guidance"),
            {"user_id": self.regular_user.id, "course_id": self.course.id},
        )
        unrelated_response = self.client.get(
            reverse("ai-learning-guidance"),
            {"user_id": self.unrelated_user.id},
        )

        self.assertEqual(related_response.status_code, status.HTTP_200_OK)
        self.assertEqual(unrelated_response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(
        AI_FEATURES_ENABLED=True,
        AI_LEARNING_GUIDANCE_ENABLED=True,
        AI_ASSIGNMENT_FEEDBACK_ENABLED=True,
        OPENROUTER_API_KEY="test-key",
    )
    @patch("apps.ai.guidance.get_default_ai_provider")
    def test_ai_ready_mode_can_override_guidance_text(self, mock_get_provider):
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
                "ai_learning_guidance_enabled": True,
                "ai_assignment_feedback_enabled": True,
            },
        }
        provider.create_chat_completion.return_value = {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"guidance_summary":"AI guidance says focus on the discovery brief next.",'
                            '"skill_gaps":[{"skill":"Design Thinking","priority":"high","rationale":"AI says this is the fastest gap to close.",'
                            '"suggested_actions":["Write one discovery example.","Compare your answer to the course prompt."]}],'
                            '"assignment_feedback":[{"lesson_id":'
                            f"{self.assignment_lesson.id}"
                            ',"readiness":"ready","feedback":"AI feedback says to anchor the brief in one user problem.",'
                            '"checklist":["State the user problem clearly.","Use one supporting example."]}]}'
                        )
                    }
                }
            ]
        }
        self.authenticate(self.regular_user)

        response = self.client.get(
            reverse("ai-learning-guidance"),
            {"course_id": self.course.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["used_ai"])
        self.assertEqual(response.data["guidance_rollout_state"], "ready")
        self.assertEqual(
            response.data["guidance_summary"],
            "AI guidance says focus on the discovery brief next.",
        )
        self.assertTrue(
            any(item["used_ai"] for item in response.data["skill_gaps"])
        )
