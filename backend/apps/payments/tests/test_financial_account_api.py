from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
from apps.common.enums import (
    FinancialAccountStatus,
    OrganizationType,
    OrganizationVerificationStatus,
    Role,
)
from apps.organizations.models import Organization
from apps.payments.models import FinancialAccount

User = get_user_model()


class FinancialAccountApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.organization_user = User.objects.create_user(
            email="payments-org@example.com",
            password="StrongPass123!",
            full_name="Payments Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="Payments Org",
            type=OrganizationType.COMPANY,
            description="Ready for finance setup.",
            contact_email="payments-org@example.com",
            country="Ethiopia",
            location="Addis Ababa",
            verification_status=OrganizationVerificationStatus.UNVERIFIED,
        )
        self.regular_user = User.objects.create_user(
            email="payments-learner@example.com",
            password="StrongPass123!",
            full_name="Learner",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.admin_user = User.objects.create_user(
            email="payments-admin@example.com",
            password="StrongPass123!",
            full_name="Payments Admin",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at="2026-07-06T00:00:00Z",
        )

    def authenticate(self, user, password="StrongPass123!"):
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": password},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

    def test_organization_can_view_default_financial_account_state(self):
        self.authenticate(self.organization_user)

        response = self.client.get(reverse("financial-account-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["provider"], "chapa")
        self.assertEqual(response.data["status"], FinancialAccountStatus.NOT_STARTED)
        self.assertFalse(response.data["can_publish_paid_courses"])
        self.assertFalse(response.data["can_accept_paid_enrollments"])
        self.assertEqual(response.data["enrollment_gate_reason"], "organization_unverified")

    def test_organization_can_submit_financial_account_details(self):
        self.organization.verification_status = OrganizationVerificationStatus.VERIFIED
        self.organization.save(update_fields=["verification_status", "updated_at"])
        self.authenticate(self.organization_user)

        response = self.client.patch(
            reverse("financial-account-me"),
            {
                "business_name": "Payments Org PLC",
                "account_holder_name": "Payments Org PLC",
                "bank_name": "Commercial Bank",
                "bank_code": "CBE001",
                "account_number": "100012341234",
                "setup_notes": "Primary payout destination.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], FinancialAccountStatus.PENDING)
        self.assertEqual(response.data["account_number_last4"], "1234")
        self.assertTrue(response.data["can_publish_paid_courses"])
        self.assertFalse(response.data["can_accept_paid_enrollments"])
        audit_log = AuditLog.objects.get(
            action="financial_account.organization.updated",
            target_id=response.data["id"],
        )
        self.assertEqual(audit_log.actor, self.organization_user)
        self.assertEqual(
            audit_log.metadata["changed_fields"],
            [
                "account_holder_name",
                "account_number_last4",
                "bank_code",
                "bank_name",
                "business_name",
                "setup_notes",
            ],
        )

    def test_regular_user_cannot_access_financial_account_endpoint(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("financial-account-me"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_ready_financial_account_allows_paid_enrollment_gate(self):
        FinancialAccount.objects.create(
            organization=self.organization,
            provider="chapa",
            status=FinancialAccountStatus.READY,
            business_name="Payments Org PLC",
            account_holder_name="Payments Org PLC",
            bank_name="Commercial Bank",
            bank_code="CBE001",
            account_number_last4="9876",
        )
        self.organization.verification_status = OrganizationVerificationStatus.VERIFIED
        self.organization.save(update_fields=["verification_status", "updated_at"])
        self.authenticate(self.organization_user)

        response = self.client.get(reverse("financial-account-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_ready"])
        self.assertTrue(response.data["can_accept_paid_enrollments"])
        self.assertEqual(response.data["enrollment_gate_reason"], "eligible")

    def test_admin_can_list_and_approve_pending_financial_accounts(self):
        financial_account = FinancialAccount.objects.create(
            organization=self.organization,
            status=FinancialAccountStatus.PENDING,
            business_name="Payments Org PLC",
            account_holder_name="Payments Org PLC",
            bank_name="Commercial Bank",
            account_number_last4="9876",
        )
        self.authenticate(self.admin_user)

        list_response = self.client.get(
            reverse("admin-financial-account-list"),
            {"status": FinancialAccountStatus.PENDING},
        )
        decision_response = self.client.post(
            reverse(
                "admin-financial-account-decision",
                args=[financial_account.id],
            ),
            {
                "decision": FinancialAccountStatus.READY,
                "review_notes": "Account details reviewed.",
            },
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(
            list_response.data[0]["organization_name"],
            self.organization.name,
        )
        self.assertEqual(decision_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            decision_response.data["status"],
            FinancialAccountStatus.READY,
        )
        financial_account.refresh_from_db()
        self.assertEqual(financial_account.reviewed_by, self.admin_user)
        self.assertIsNotNone(financial_account.reviewed_at)
        self.assertIsNotNone(financial_account.verified_at)
        audit_log = AuditLog.objects.get(
            action="financial_account.admin.reviewed",
            target_id=financial_account.id,
        )
        self.assertEqual(audit_log.actor, self.admin_user)
        self.assertEqual(audit_log.metadata["decision"], FinancialAccountStatus.READY)

    def test_admin_restriction_requires_and_exposes_reason(self):
        financial_account = FinancialAccount.objects.create(
            organization=self.organization,
            status=FinancialAccountStatus.PENDING,
            business_name="Payments Org PLC",
        )
        self.authenticate(self.admin_user)

        missing_reason_response = self.client.post(
            reverse(
                "admin-financial-account-decision",
                args=[financial_account.id],
            ),
            {"decision": FinancialAccountStatus.RESTRICTED},
            format="json",
        )
        restricted_response = self.client.post(
            reverse(
                "admin-financial-account-decision",
                args=[financial_account.id],
            ),
            {
                "decision": FinancialAccountStatus.RESTRICTED,
                "restricted_reason": "Account holder name does not match.",
            },
            format="json",
        )

        self.assertEqual(
            missing_reason_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(restricted_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            restricted_response.data["status"],
            FinancialAccountStatus.RESTRICTED,
        )
        self.assertEqual(
            restricted_response.data["restricted_reason"],
            "Account holder name does not match.",
        )

    def test_non_admin_cannot_access_financial_review_queue(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("admin-financial-account-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_editing_approved_payout_details_returns_account_to_pending(self):
        financial_account = FinancialAccount.objects.create(
            organization=self.organization,
            status=FinancialAccountStatus.READY,
            business_name="Payments Org PLC",
            bank_name="Commercial Bank",
            account_number_last4="9876",
            reviewed_by=self.admin_user,
            reviewed_at="2026-07-06T00:00:00Z",
            verified_at="2026-07-06T00:00:00Z",
        )
        self.authenticate(self.organization_user)

        response = self.client.patch(
            reverse("financial-account-me"),
            {"bank_name": "Updated Bank"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["status"],
            FinancialAccountStatus.PENDING,
        )
        financial_account.refresh_from_db()
        self.assertIsNone(financial_account.reviewed_by)
        self.assertIsNone(financial_account.reviewed_at)
        self.assertIsNone(financial_account.verified_at)
