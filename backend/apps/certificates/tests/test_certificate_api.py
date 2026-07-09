from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.certificates.models import Certificate, ServiceCreditRecord
from apps.common.enums import (
    CertificateStatus,
    CourseProgramStatus,
    EventStatus,
    OrganizationType,
    OrganizationVerificationStatus,
    Role,
    ServiceCreditStatus,
)
from apps.courses.models import CourseProgram, Enrollment
from apps.events.models import Event, EventRSVP
from apps.organizations.models import Organization

User = get_user_model()


class CertificateApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org_owner = User.objects.create_user(
            email="org-cert@example.com",
            password="StrongPass123!",
            full_name="Cert Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-09T00:00:00Z",
        )
        self.regular_user = User.objects.create_user(
            email="learner-cert@example.com",
            password="StrongPass123!",
            full_name="Learner Cert",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-09T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.org_owner,
            name="Verified Issuer",
            type=OrganizationType.COMPANY,
            description="Issues trusted records.",
            contact_email="issuer@example.com",
            verification_status=OrganizationVerificationStatus.VERIFIED,
        )
        self.course = CourseProgram.objects.create(
            organization=self.organization,
            title="Community Leadership",
            description="Leadership course",
            category="Leadership",
            status=CourseProgramStatus.PUBLISHED,
            is_free=True,
        )
        self.event = Event.objects.create(
            organization=self.organization,
            title="Community Impact Day",
            description="Impact event",
            category="Volunteer",
            location="Addis Ababa",
            status=EventStatus.COMPLETED,
            starts_at=timezone.now(),
            ends_at=timezone.now(),
        )
        Enrollment.objects.create(
            user=self.regular_user,
            course_program=self.course,
            status="completed",
            progress_percent=100,
            completed_at=timezone.now(),
        )
        EventRSVP.objects.create(
            user=self.regular_user,
            event=self.event,
            status="going",
            attended_at=timezone.now(),
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_verified_organization_can_issue_service_credit(self):
        self.authenticate(self.org_owner)

        response = self.client.post(
            reverse("organization-service-credit-issue"),
            {
                "user_id": self.regular_user.id,
                "event_id": self.event.id,
                "title": "Volunteer Support",
                "description": "Supported the community event.",
                "credit_hours": "4.50",
                "evidence_note": "Attendance verified by the organizer.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Volunteer Support")
        self.assertTrue(
            ServiceCreditRecord.objects.filter(
                organization=self.organization,
                user=self.regular_user,
            ).exists()
        )

    def test_verified_organization_can_issue_course_certificate_and_public_lookup_works(self):
        self.authenticate(self.org_owner)

        issue_response = self.client.post(
            reverse("organization-certificate-issue"),
            {
                "source_type": "course_completion",
                "user_id": self.regular_user.id,
                "course_id": self.course.id,
            },
            format="json",
        )

        self.assertEqual(issue_response.status_code, status.HTTP_201_CREATED)
        certificate_id = issue_response.data["certificate_id"]
        self.assertTrue(
            Certificate.objects.filter(
                certificate_id=certificate_id,
                organization=self.organization,
                user=self.regular_user,
            ).exists()
        )

        self.client.force_authenticate(user=None)
        lookup_response = self.client.get(reverse("certificate-detail", args=[certificate_id]))

        self.assertEqual(lookup_response.status_code, status.HTTP_200_OK)
        self.assertEqual(lookup_response.data["certificate_id"], certificate_id)
        self.assertEqual(lookup_response.data["organization"]["name"], self.organization.name)

    def test_service_credit_requires_exactly_one_evidence_source(self):
        self.authenticate(self.org_owner)

        response = self.client.post(
            reverse("organization-service-credit-issue"),
            {
                "user_id": self.regular_user.id,
                "event_id": self.event.id,
                "course_id": self.course.id,
                "title": "Too broad",
                "credit_hours": "2.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_duplicate_active_course_certificate_is_rejected(self):
        self.authenticate(self.org_owner)
        payload = {
            "source_type": "course_completion",
            "user_id": self.regular_user.id,
            "course_id": self.course.id,
        }

        first_response = self.client.post(
            reverse("organization-certificate-issue"),
            payload,
            format="json",
        )
        second_response = self.client.post(
            reverse("organization-certificate-issue"),
            payload,
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            Certificate.objects.filter(
                organization=self.organization,
                user=self.regular_user,
                course_program=self.course,
                source_type="course_completion",
                status=CertificateStatus.ACTIVE,
            ).count(),
            1,
        )

    def test_organization_trust_overview_returns_eligible_records(self):
        self.authenticate(self.org_owner)

        response = self.client.get(reverse("organization-trust-overview"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["eligible_course_completions"]), 1)
        self.assertEqual(len(response.data["eligible_event_attendances"]), 1)
        self.assertEqual(
            response.data["eligible_course_completions"][0]["course"]["id"],
            self.course.id,
        )
        self.assertEqual(
            response.data["eligible_event_attendances"][0]["event"]["id"],
            self.event.id,
        )

    def test_organization_can_revoke_issued_service_credit_and_certificate(self):
        self.authenticate(self.org_owner)

        service_credit_response = self.client.post(
            reverse("organization-service-credit-issue"),
            {
                "user_id": self.regular_user.id,
                "event_id": self.event.id,
                "title": "Volunteer Support",
                "description": "Supported the community event.",
                "credit_hours": "4.50",
            },
            format="json",
        )
        certificate_response = self.client.post(
            reverse("organization-certificate-issue"),
            {
                "source_type": "course_completion",
                "user_id": self.regular_user.id,
                "course_id": self.course.id,
            },
            format="json",
        )

        revoke_service_credit_response = self.client.post(
            reverse(
                "organization-service-credit-revoke",
                args=[service_credit_response.data["id"]],
            ),
            {"reason": "Evidence needs correction."},
            format="json",
        )
        revoke_certificate_response = self.client.post(
            reverse(
                "organization-certificate-revoke",
                args=[certificate_response.data["id"]],
            ),
            {"reason": "Certificate reissue requested."},
            format="json",
        )

        self.assertEqual(revoke_service_credit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(revoke_certificate_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            ServiceCreditRecord.objects.get(id=service_credit_response.data["id"]).status,
            ServiceCreditStatus.REVOKED,
        )
        self.assertEqual(
            Certificate.objects.get(id=certificate_response.data["id"]).status,
            CertificateStatus.REVOKED,
        )
