from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.enums import OrganizationType, OrganizationVerificationStatus, Role
from apps.organizations.models import Organization

User = get_user_model()


class OrganizationProfileApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.organization_user = User.objects.create_user(
            email="org-profile@example.com",
            password="StrongPass123!",
            full_name="SkillVerse Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="SkillVerse Org",
            type=OrganizationType.COMPANY,
            description="Initial description.",
            contact_email="contact@skillverse.org",
            country="Kenya",
            location="Nairobi",
            verification_status=OrganizationVerificationStatus.UNVERIFIED,
        )
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": self.organization_user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

    def test_organization_owner_can_view_and_update_profile(self):
        retrieve_response = self.client.get(reverse("organization-me"))
        self.assertEqual(retrieve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            retrieve_response.data["verification_status"],
            OrganizationVerificationStatus.UNVERIFIED,
        )

        upload = SimpleUploadedFile(
            "license.pdf",
            b"%PDF-1.4 organization-license",
            content_type="application/pdf",
        )
        update_response = self.client.patch(
            reverse("organization-me"),
            {
                "description": "Expanded public organization profile.",
                "website_url": "https://skillverse.org",
                "contact_phone": "+254700000000",
                "offerings_summary": "Free workshops, paid bootcamps, and career programs.",
                "business_license": upload,
            },
            format="multipart",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.website_url, "https://skillverse.org")
        self.assertEqual(
            self.organization.offerings_summary,
            "Free workshops, paid bootcamps, and career programs.",
        )
        self.assertTrue(update_response.data["has_business_license"])

    def test_public_profile_exposes_trust_sensitive_fields(self):
        self.client.credentials()
        response = self.client.get(
            reverse("organization-public-profile", args=[self.organization.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], self.organization.name)
        self.assertEqual(
            response.data["verification_status"],
            OrganizationVerificationStatus.UNVERIFIED,
        )
        self.assertNotIn("owner_email", response.data)
        self.assertNotIn("contact_email", response.data)
        self.assertNotIn("business_license", response.data)

    def test_regular_user_cannot_access_private_organization_profile_endpoint(self):
        self.client.credentials()
        regular_user = User.objects.create_user(
            email="regular@example.com",
            password="StrongPass123!",
            full_name="Regular User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": regular_user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

        response = self.client.get(reverse("organization-me"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_guest_cannot_access_private_organization_profile_endpoint(self):
        self.client.credentials()

        response = self.client.get(reverse("organization-me"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
