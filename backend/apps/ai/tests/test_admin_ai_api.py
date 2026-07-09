from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.enums import Role

User = get_user_model()


class AdminAIProviderHealthApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.admin_user = User.objects.create_user(
            email="admin-ai@example.com",
            password="StrongPass123!",
            full_name="AI Admin",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at="2026-07-08T00:00:00Z",
        )
        self.regular_user = User.objects.create_user(
            email="member-ai@example.com",
            password="StrongPass123!",
            full_name="Member",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-08T00:00:00Z",
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_admin_can_read_ai_provider_config_summary(self):
        self.authenticate(self.admin_user)

        response = self.client.get(reverse("admin-ai-provider-health"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["provider"], "openrouter")
        self.assertIn("feature_flags", response.data)
        self.assertEqual(response.data["mode"], "config")

    @patch("apps.ai.views.get_default_ai_provider")
    def test_admin_can_run_live_provider_check(self, mock_get_provider):
        provider = mock_get_provider.return_value
        provider.verify.return_value = {
            "provider": "openrouter",
            "configured": True,
            "healthy": True,
            "mode": "live",
            "default_model": "google/gemma-3n-e4b-it:free",
            "base_url": "https://openrouter.ai",
            "timeout_seconds": 20,
            "has_api_key": True,
            "using_legacy_env_key": False,
            "feature_flags": {
                "ai_features_enabled": True,
                "ai_recommendations_enabled": True,
                "ai_learning_guidance_enabled": True,
                "ai_assignment_feedback_enabled": False,
                "ai_cognitive_monitoring_enabled": False,
            },
            "details": {
                "models_returned": 12,
                "sample_model": "google/gemma-3n-e4b-it:free",
            },
        }
        self.authenticate(self.admin_user)

        response = self.client.get(
            reverse("admin-ai-provider-health"),
            {"mode": "live"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["healthy"])
        self.assertEqual(response.data["details"]["models_returned"], 12)
        provider.verify.assert_called_once_with(mode="live")

    def test_authenticated_user_can_read_ai_capability_snapshot(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("ai-capability-snapshot"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["provider"], "openrouter")
        self.assertEqual(response.data["actor_role"], Role.REGULAR_USER)
        self.assertIn("fallback_contract", response.data)
        self.assertIn("integration_rules", response.data)
        self.assertGreaterEqual(len(response.data["features"]), 1)

    def test_non_admin_cannot_access_ai_provider_health(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("admin-ai-provider-health"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
