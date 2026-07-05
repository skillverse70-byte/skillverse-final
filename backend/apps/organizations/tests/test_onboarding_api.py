from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import AccountActionToken
from apps.common.enums import OrganizationType, OrganizationVerificationStatus, Role
from apps.organizations.models import Organization

User = get_user_model()


class OrganizationOnboardingApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()

    def test_organization_register_creates_unverified_org_account_and_sends_email(self):
        response = self.client.post(
            reverse("auth-organization-register"),
            {
                "organization_name": "Bright Skills Hub",
                "organization_type": OrganizationType.TRAINING_CENTER,
                "email": "org@example.com",
                "password": "StrongPass123!",
                "description": "Practical digital upskilling for job seekers.",
                "country": "Ethiopia",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="org@example.com")
        organization = Organization.objects.get(owner=user)

        self.assertEqual(user.role, Role.ORGANIZATION)
        self.assertFalse(user.is_email_verified)
        self.assertEqual(user.full_name, "Bright Skills Hub")
        self.assertEqual(organization.name, "Bright Skills Hub")
        self.assertEqual(organization.type, OrganizationType.TRAINING_CENTER)
        self.assertEqual(
            organization.verification_status,
            OrganizationVerificationStatus.UNVERIFIED,
        )
        self.assertEqual(mail.outbox[-1].to, ["org@example.com"])
        self.assertIn("verification code", mail.outbox[-1].body.lower())
        self.assertEqual(response.data["organization"]["verification_status"], "unverified")
        self.assertTrue(response.data["verification_required"])

    def test_organization_register_requires_country_or_location(self):
        response = self.client.post(
            reverse("auth-organization-register"),
            {
                "organization_name": "No Location Org",
                "organization_type": OrganizationType.NGO,
                "email": "noloc@example.com",
                "password": "StrongPass123!",
                "description": "Missing place fields.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("location", response.data)

    def test_regular_user_cannot_convert_existing_account_into_organization(self):
        User.objects.create_user(
            email="existing@example.com",
            password="StrongPass123!",
            full_name="Existing User",
            role=Role.REGULAR_USER,
        )

        response = self.client.post(
            reverse("auth-organization-register"),
            {
                "organization_name": "Existing Account Org",
                "organization_type": OrganizationType.COMPANY,
                "email": "existing@example.com",
                "password": "StrongPass123!",
                "description": "Should not convert.",
                "location": "Addis Ababa",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertFalse(Organization.objects.filter(name="Existing Account Org").exists())

    def test_verified_organization_can_complete_email_verification(self):
        register_response = self.client.post(
            reverse("auth-organization-register"),
            {
                "organization_name": "Verified Org Flow",
                "organization_type": OrganizationType.COMPANY,
                "email": "verified-org@example.com",
                "password": "StrongPass123!",
                "description": "Verifies through the shared auth path.",
                "location": "Nairobi",
            },
            format="json",
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email="verified-org@example.com")
        token = AccountActionToken.objects.get(
            user=user,
            purpose=AccountActionToken.Purpose.EMAIL_VERIFICATION,
        )

        verify_response = self.client.post(
            reverse("auth-verify-email"),
            {"email": user.email, "code": token.token},
            format="json",
        )

        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        self.assertEqual(verify_response.data["user"]["role"], Role.ORGANIZATION)
