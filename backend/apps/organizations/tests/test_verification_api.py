from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
from apps.common.enums import (
    OrganizationType,
    OrganizationVerificationReviewStatus,
    OrganizationVerificationStatus,
    Role,
)
from apps.organizations.models import Organization, OrganizationVerificationRequest

User = get_user_model()


class OrganizationVerificationApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.organization_user = User.objects.create_user(
            email="verify-org@example.com",
            password="StrongPass123!",
            full_name="Verify Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="Verify Org",
            type=OrganizationType.COMPANY,
            description="Org awaiting trust review.",
            contact_email="verify-org@example.com",
            country="Kenya",
            location="Nairobi",
            verification_status=OrganizationVerificationStatus.UNVERIFIED,
        )
        self.admin_user = User.objects.create_user(
            email="admin-verify@example.com",
            password="StrongPass123!",
            full_name="Admin Reviewer",
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
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

    def test_registration_with_business_license_creates_pending_verification_request(self):
        upload = SimpleUploadedFile(
            "license.pdf",
            b"%PDF-1.4 verification-license",
            content_type="application/pdf",
        )

        response = self.client.post(
            reverse("auth-organization-register"),
            {
                "organization_name": "Licensed Org",
                "organization_type": OrganizationType.INSTITUTION,
                "email": "licensed-org@example.com",
                "password": "StrongPass123!",
                "description": "Created with a license upload.",
                "location": "Addis Ababa",
                "business_license": upload,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        organization = Organization.objects.get(name="Licensed Org")
        verification_request = organization.verification_requests.get()
        self.assertEqual(
            verification_request.status,
            OrganizationVerificationReviewStatus.PENDING,
        )

    def test_organization_can_submit_and_view_verification_request_history(self):
        self.authenticate(self.organization_user)

        submit_response = self.client.post(
            reverse("organization-verification-submit"),
            {"request_notes": "We are ready for trust review."},
            format="json",
        )
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            submit_response.data["status"],
            OrganizationVerificationReviewStatus.PENDING,
        )

        overview_response = self.client.get(reverse("organization-verification-me"))
        self.assertEqual(overview_response.status_code, status.HTTP_200_OK)
        self.assertEqual(overview_response.data["organization"]["id"], self.organization.id)
        self.assertEqual(len(overview_response.data["history"]), 1)
        self.assertEqual(
            overview_response.data["pending_request"]["status"],
            OrganizationVerificationReviewStatus.PENDING,
        )

    def test_admin_can_approve_pending_verification_request_and_audit_it(self):
        verification_request = OrganizationVerificationRequest.objects.create(
            organization=self.organization,
            requested_by=self.organization_user,
            request_notes="Please review our documentation.",
        )

        self.authenticate(self.admin_user)

        list_response = self.client.get(
            reverse("admin-organization-verification-request-list"),
            {"status": OrganizationVerificationReviewStatus.PENDING},
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

        decision_response = self.client.post(
            reverse(
                "admin-organization-verification-request-decision",
                args=[verification_request.id],
            ),
            {
                "decision": OrganizationVerificationReviewStatus.APPROVED,
                "reviewer_notes": "Verified after review.",
                "use_admin_override": True,
            },
            format="json",
        )
        self.assertEqual(decision_response.status_code, status.HTTP_200_OK)

        verification_request.refresh_from_db()
        self.organization.refresh_from_db()
        self.assertEqual(
            verification_request.status,
            OrganizationVerificationReviewStatus.APPROVED,
        )
        self.assertTrue(verification_request.used_admin_override)
        self.assertEqual(
            self.organization.verification_status,
            OrganizationVerificationStatus.VERIFIED,
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action="organization.verification.reviewed",
                target_id=verification_request.id,
            ).exists()
        )

    def test_admin_cannot_approve_without_license_unless_override_is_used(self):
        verification_request = OrganizationVerificationRequest.objects.create(
            organization=self.organization,
            requested_by=self.organization_user,
            request_notes="No document attached yet.",
        )
        self.authenticate(self.admin_user)

        response = self.client.post(
            reverse(
                "admin-organization-verification-request-decision",
                args=[verification_request.id],
            ),
            {
                "decision": OrganizationVerificationReviewStatus.APPROVED,
                "reviewer_notes": "Cannot approve without override.",
                "use_admin_override": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("use_admin_override", response.data)
