from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
from apps.common.enums import Role

User = get_user_model()


class AuditApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        verified_at = timezone.now()
        self.admin_user = User.objects.create_user(
            email="audit-admin@example.com",
            password="StrongPass123!",
            full_name="Audit Admin",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at=verified_at,
        )
        self.regular_user = User.objects.create_user(
            email="audit-user@example.com",
            password="StrongPass123!",
            full_name="Audit User",
            role=Role.REGULAR_USER,
            email_verified_at=verified_at,
        )
        self.other_admin = User.objects.create_user(
            email="other-audit-admin@example.com",
            password="StrongPass123!",
            full_name="Other Audit Admin",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at=verified_at,
        )

        older_time = timezone.now() - timedelta(days=2)
        self.finance_log = AuditLog.objects.create(
            actor=self.admin_user,
            action="financial_account.admin.reviewed",
            target_type="financial_account",
            target_id=11,
            summary="Admin approved a finance account.",
            metadata={"decision": "ready"},
        )
        AuditLog.objects.filter(pk=self.finance_log.pk).update(created_at=older_time)
        self.finance_log.refresh_from_db()

        self.payment_log = AuditLog.objects.create(
            actor=self.regular_user,
            action="payment.checkout.created",
            target_type="payment_transaction",
            target_id=27,
            summary="Learner started checkout for Data Analytics Bootcamp.",
            metadata={"tx_ref": "SV-27"},
        )
        self.taxonomy_log = AuditLog.objects.create(
            actor=self.other_admin,
            action="taxonomy.suggestion.reviewed",
            target_type="category_suggestion",
            target_id=38,
            summary="Admin approved a taxonomy suggestion.",
            metadata={"decision": "approved"},
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_admin_can_list_and_filter_audit_logs(self):
        self.authenticate(self.admin_user)

        response = self.client.get(
            reverse("admin-audit-log-list"),
            {
                "target_type": "payment_transaction",
                "search": "checkout",
                "actor_id": self.regular_user.id,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.payment_log.id)
        self.assertEqual(response.data[0]["actor_email"], self.regular_user.email)

    def test_admin_can_filter_audit_logs_by_date_and_action(self):
        self.authenticate(self.admin_user)

        response = self.client.get(
            reverse("admin-audit-log-list"),
            {
                "action": "financial_account.admin.reviewed",
                "created_before": (timezone.now() - timedelta(days=1)).isoformat(),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.finance_log.id)

    def test_admin_can_retrieve_single_audit_log(self):
        self.authenticate(self.admin_user)

        response = self.client.get(
            reverse("admin-audit-log-detail", args=[self.taxonomy_log.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["action"], "taxonomy.suggestion.reviewed")
        self.assertEqual(response.data["metadata"]["decision"], "approved")

    def test_non_admin_cannot_access_audit_endpoints(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("admin-audit-log-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
