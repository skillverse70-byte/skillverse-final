from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ai.models import AdaptiveMonitoringCheckIn, CognitiveMonitoringConsentRecord
from apps.audit.models import AuditLog
from apps.common.enums import (
    AIFeatureKey,
    CognitiveMonitoringConsentStatus,
    CourseProgramStatus,
    EnrollmentStatus,
    LessonItemType,
    OrganizationType,
    Role,
)
from apps.courses.models import CourseModule, CourseProgram, Enrollment, EnrollmentLessonProgress, LessonItem
from apps.organizations.models import Organization

User = get_user_model()


class CognitiveMonitoringApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.regular_user = User.objects.create_user(
            email="focus-user@example.com",
            password="StrongPass123!",
            full_name="Focus User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-09T00:00:00Z",
        )
        self.admin_user = User.objects.create_user(
            email="focus-admin@example.com",
            password="StrongPass123!",
            full_name="Focus Admin",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at="2026-07-09T00:00:00Z",
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_regular_user_can_read_cognitive_monitoring_policy_and_empty_state(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("ai-cognitive-monitoring-consent"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["feature_key"], AIFeatureKey.COGNITIVE_MONITORING)
        self.assertFalse(response.data["is_consented"])
        self.assertFalse(response.data["policy"]["camera_required"])
        self.assertIn("lesson_progress", response.data["policy"]["default_signal_keys"])

    def test_regular_user_can_grant_and_revoke_cognitive_monitoring_consent(self):
        self.authenticate(self.regular_user)

        grant_response = self.client.post(
            reverse("ai-cognitive-monitoring-consent"),
            {
                "allowed_signals": [
                    "lesson_progress",
                    "self_reported_mood",
                ],
                "acknowledged_disclosure": True,
                "source_surface": "/dashboard",
            },
            format="json",
        )

        self.assertEqual(grant_response.status_code, status.HTTP_200_OK)
        self.assertTrue(grant_response.data["is_consented"])
        self.assertEqual(
            grant_response.data["active_consent"]["status"],
            CognitiveMonitoringConsentStatus.ACTIVE,
        )
        record = CognitiveMonitoringConsentRecord.objects.get(user=self.regular_user)
        self.assertEqual(record.source_surface, "/dashboard")
        self.assertTrue(
            AuditLog.objects.filter(
                action="ai.cognitive_monitoring.consent_granted",
                target_id=record.id,
            ).exists()
        )

        revoke_response = self.client.post(
            reverse("ai-cognitive-monitoring-consent-revoke"),
            {"reason": "Pause adaptive monitoring for now."},
            format="json",
        )

        self.assertEqual(revoke_response.status_code, status.HTTP_200_OK)
        self.assertFalse(revoke_response.data["is_consented"])
        record.refresh_from_db()
        self.assertEqual(record.status, CognitiveMonitoringConsentStatus.REVOKED)
        self.assertEqual(record.revoked_reason, "Pause adaptive monitoring for now.")
        self.assertTrue(
            AuditLog.objects.filter(
                action="ai.cognitive_monitoring.consent_revoked",
                target_id=record.id,
            ).exists()
        )

    def test_disallowed_signal_is_rejected(self):
        self.authenticate(self.regular_user)

        response = self.client.post(
            reverse("ai-cognitive-monitoring-consent"),
            {
                "allowed_signals": ["camera_feed"],
                "acknowledged_disclosure": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("allowed_signals", response.data)

    def test_admin_can_read_cognitive_monitoring_overview(self):
        CognitiveMonitoringConsentRecord.objects.create(
            user=self.regular_user,
            feature_key=AIFeatureKey.COGNITIVE_MONITORING,
            status=CognitiveMonitoringConsentStatus.ACTIVE,
            policy_version="2026-07-v1",
            allowed_signals=["lesson_progress", "self_reported_mood"],
            surfaces=["/dashboard", "/courses/:id", "/messages"],
            disclosure_acknowledged=True,
        )
        self.authenticate(self.admin_user)

        response = self.client.get(reverse("admin-ai-cognitive-monitoring-overview"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["active_consents"], 1)
        self.assertEqual(response.data["summary"]["distinct_consented_users"], 1)
        self.assertEqual(len(response.data["recent_records"]), 1)
        self.assertEqual(
            response.data["recent_records"][0]["user"]["email"],
            self.regular_user.email,
        )

    def test_non_admin_cannot_read_cognitive_monitoring_overview(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("admin-ai-cognitive-monitoring-overview"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(
    AI_FEATURES_ENABLED=True,
    AI_COGNITIVE_MONITORING_ENABLED=True,
    OPENROUTER_API_KEY="test-openrouter-key",
)
class AdaptiveMonitoringApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.admin_user = User.objects.create_user(
            email="adaptive-admin@example.com",
            password="StrongPass123!",
            full_name="Adaptive Admin",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at="2026-07-09T00:00:00Z",
        )
        self.organization_user = User.objects.create_user(
            email="adaptive-org@example.com",
            password="StrongPass123!",
            full_name="Adaptive Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-09T00:00:00Z",
        )
        self.regular_user = User.objects.create_user(
            email="adaptive-user@example.com",
            password="StrongPass123!",
            full_name="Adaptive User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-09T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="Adaptive Learning Org",
            type=OrganizationType.COMPANY,
            description="Runs adaptive courses.",
            contact_email="adaptive-org@example.com",
        )
        self.course = CourseProgram.objects.create(
            organization=self.organization,
            title="Focus Fundamentals",
            description="Learn focus skills.",
            category="Learning",
            status=CourseProgramStatus.PUBLISHED,
            is_free=True,
        )
        self.module = CourseModule.objects.create(
            course_program=self.course,
            title="Start Here",
            sort_order=0,
        )
        self.lesson = LessonItem.objects.create(
            module=self.module,
            title="First lesson",
            item_type=LessonItemType.VIDEO,
            sort_order=0,
        )
        LessonItem.objects.create(
            module=self.module,
            title="Reflection checkpoint",
            item_type=LessonItemType.ASSIGNMENT,
            sort_order=1,
        )
        self.enrollment = Enrollment.objects.create(
            user=self.regular_user,
            course_program=self.course,
            status=EnrollmentStatus.ACTIVE,
            progress_percent=20,
        )
        EnrollmentLessonProgress.objects.create(
            enrollment=self.enrollment,
            lesson_item=self.lesson,
            is_completed=True,
            completed_at=timezone.now(),
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def grant_consent(self, user=None):
        return CognitiveMonitoringConsentRecord.objects.create(
            user=user or self.regular_user,
            feature_key=AIFeatureKey.COGNITIVE_MONITORING,
            status=CognitiveMonitoringConsentStatus.ACTIVE,
            policy_version="2026-07-v1",
            allowed_signals=[
                "lesson_progress",
                "enrollment_activity",
                "assignment_activity",
                "session_engagement",
                "message_responsiveness",
                "self_reported_mood",
                "reflection_checkins",
            ],
            surfaces=["/dashboard", "/courses/:id", "/messages"],
            disclosure_acknowledged=True,
        )

    def test_adaptive_state_without_consent_returns_inactive_fallback(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("ai-adaptive-monitoring-state"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["monitoring_active"])
        self.assertTrue(response.data["fallback_active"])
        self.assertEqual(response.data["focus_drift"]["level"], "inactive")
        self.assertEqual(response.data["mood_mirror"]["state"], "inactive")

    def test_adaptive_state_uses_only_consented_signals(self):
        consent = self.grant_consent()
        consent.allowed_signals = ["lesson_progress", "self_reported_mood"]
        consent.save(update_fields=["allowed_signals"])
        AdaptiveMonitoringCheckIn.objects.create(
            user=self.regular_user,
            course_program=self.course,
            mood_label="overwhelmed",
            focus_level=1,
            energy_level=2,
            stress_level=5,
            reflection_note="I am losing track of the next step.",
        )
        self.authenticate(self.regular_user)

        response = self.client.get(
            reverse("ai-adaptive-monitoring-state"),
            {"course_id": self.course.id, "surface": "/courses/:id"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["monitoring_active"])
        self.assertEqual(response.data["active_signal_keys"], ["lesson_progress", "self_reported_mood"])
        self.assertEqual(
            [signal["key"] for signal in response.data["signals"]],
            ["lesson_progress", "self_reported_mood"],
        )
        self.assertEqual(response.data["mood_mirror"]["state"], "strained")
        self.assertGreaterEqual(response.data["focus_drift"]["score"], 40)

    def test_regular_user_can_submit_checkin_and_get_adaptive_response(self):
        self.grant_consent()
        self.authenticate(self.regular_user)

        response = self.client.post(
            reverse("ai-adaptive-monitoring-check-in"),
            {
                "course_id": self.course.id,
                "surface": "/dashboard",
                "mood_label": "stuck",
                "focus_level": 2,
                "energy_level": 2,
                "stress_level": 4,
                "reflection_note": "I need a smaller next action.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AdaptiveMonitoringCheckIn.objects.filter(user=self.regular_user).exists())
        self.assertTrue(response.data["adaptive_responses"])
        self.assertEqual(response.data["mood_mirror"]["state"], "strained")
        self.assertTrue(
            AuditLog.objects.filter(
                action="ai.adaptive_monitoring.check_in_created",
                actor=self.regular_user,
            ).exists()
        )

    def test_checkin_requires_active_consent(self):
        self.authenticate(self.regular_user)

        response = self.client.post(
            reverse("ai-adaptive-monitoring-check-in"),
            {"mood_label": "steady"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_checkin_requires_self_report_signal_consent(self):
        consent = self.grant_consent()
        consent.allowed_signals = ["lesson_progress"]
        consent.save(update_fields=["allowed_signals"])
        self.authenticate(self.regular_user)

        response = self.client.post(
            reverse("ai-adaptive-monitoring-check-in"),
            {"mood_label": "steady"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_inspect_regular_user_adaptive_state(self):
        self.grant_consent()
        self.authenticate(self.admin_user)

        response = self.client.get(
            reverse("ai-adaptive-monitoring-state"),
            {"user_id": self.regular_user.id, "course_id": self.course.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["target_user"]["id"], self.regular_user.id)
        self.assertTrue(response.data["signals"])
