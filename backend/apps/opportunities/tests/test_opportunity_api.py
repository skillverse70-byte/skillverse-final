from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.enums import (
    ExperienceLevel,
    JobApplicationStatus,
    OpportunityStatus,
    OpportunityType,
    OrganizationType,
    Role,
)
from apps.opportunities.models import JobApplication, Opportunity
from apps.organizations.models import Organization

User = get_user_model()


class OpportunityApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.organization_user = User.objects.create_user(
            email="jobs-org@example.com",
            password="StrongPass123!",
            full_name="Jobs Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="Jobs Org",
            type=OrganizationType.COMPANY,
            description="Publishes opportunities.",
            contact_email="org@example.com",
        )
        self.other_org_user = User.objects.create_user(
            email="other-jobs-org@example.com",
            password="StrongPass123!",
            full_name="Other Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.other_organization = Organization.objects.create(
            owner=self.other_org_user,
            name="Other Org",
            type=OrganizationType.INSTITUTION,
            description="Separate owner.",
            contact_email="other-org@example.com",
        )
        self.regular_user = User.objects.create_user(
            email="jobs-user@example.com",
            password="StrongPass123!",
            full_name="Regular User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.opportunity = Opportunity.objects.create(
            organization=self.organization,
            title="Junior Frontend Developer",
            description="Build polished interfaces.",
            type=OpportunityType.JOB,
            status=OpportunityStatus.OPEN,
            category="Engineering",
            location="Remote",
            is_remote=True,
            experience_level=ExperienceLevel.EARLY_CAREER,
            salary_range="ETB 30,000 - 45,000",
            deadline=timezone.localdate() + timedelta(days=14),
            required_skills=["React", "CSS"],
            field_signals=["software", "frontend"],
        )

    def authenticate(self, email, password):
        cache.clear()
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_guest_can_list_and_view_public_opportunities(self):
        list_response = self.client.get(reverse("job-list"))
        detail_response = self.client.get(reverse("job-detail", args=[self.opportunity.id]))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["title"], self.opportunity.title)
        self.assertEqual(detail_response.data["company_name"], self.organization.name)
        self.assertEqual(detail_response.data["viewer_application_status"], None)

    def test_organization_can_create_and_update_opportunity(self):
        self.authenticate("jobs-org@example.com", "StrongPass123!")

        create_response = self.client.post(
            reverse("job-manage-list-create"),
            {
                "title": "Product Design Intern",
                "description": "Support the design team.",
                "type": OpportunityType.INTERNSHIP,
                "status": OpportunityStatus.OPEN,
                "category": "Design",
                "location": "Addis Ababa",
                "is_remote": False,
                "experience_level": ExperienceLevel.STUDENT,
                "deadline": str(timezone.localdate() + timedelta(days=21)),
                "required_skills": ["Figma"],
                "field_signals": ["design"],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        opportunity_id = create_response.data["id"]

        update_response = self.client.patch(
            reverse("job-manage-detail", args=[opportunity_id]),
            {"salary_range": "Stipend provided"},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["salary_range"], "Stipend provided")

    def test_regular_user_cannot_create_opportunity(self):
        self.authenticate("jobs-user@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("job-manage-list-create"),
            {
                "title": "Blocked opportunity",
                "description": "Nope",
                "type": OpportunityType.JOB,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_can_apply_once_and_list_applications(self):
        self.authenticate("jobs-user@example.com", "StrongPass123!")

        apply_response = self.client.post(
            reverse("job-apply", args=[self.opportunity.id]),
            {"cover_letter": "I would love to contribute."},
            format="json",
        )
        list_response = self.client.get(reverse("job-application-list"))
        detail_response = self.client.get(reverse("job-detail", args=[self.opportunity.id]))

        self.assertEqual(apply_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["opportunity_id"], self.opportunity.id)
        self.assertEqual(detail_response.data["viewer_application_status"], JobApplicationStatus.APPLIED)

        second_apply_response = self.client.post(
            reverse("job-apply", args=[self.opportunity.id]),
            {"cover_letter": "Duplicate"},
            format="json",
        )
        self.assertEqual(second_apply_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_regular_users_can_apply(self):
        self.authenticate("jobs-org@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("job-apply", args=[self.opportunity.id]),
            {"cover_letter": "Owner trying to apply."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_organization_can_review_applicant_pipeline(self):
        application = JobApplication.objects.create(
            user=self.regular_user,
            opportunity=self.opportunity,
            status=JobApplicationStatus.APPLIED,
            cover_letter="Initial application.",
        )
        self.authenticate("jobs-org@example.com", "StrongPass123!")

        list_response = self.client.get(reverse("job-manage-application-list"))
        update_response = self.client.patch(
            reverse("job-manage-application-detail", args=[application.id]),
            {
                "status": JobApplicationStatus.SHORTLISTED,
                "reviewer_notes": "Strong portfolio fit.",
            },
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["applicant"]["id"], self.regular_user.id)
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["status"], JobApplicationStatus.SHORTLISTED)

    def test_organization_can_filter_applicant_pipeline_by_opportunity_and_status(self):
        second_opportunity = Opportunity.objects.create(
            organization=self.organization,
            title="Community Program Coordinator",
            description="Coordinate community engagement.",
            type=OpportunityType.PROGRAM,
            status=OpportunityStatus.OPEN,
            category="Community",
            location="Addis Ababa",
            deadline=timezone.localdate() + timedelta(days=30),
        )
        JobApplication.objects.create(
            user=self.regular_user,
            opportunity=self.opportunity,
            status=JobApplicationStatus.INTERVIEW,
        )
        other_user = User.objects.create_user(
            email="pipeline-user@example.com",
            password="StrongPass123!",
            full_name="Pipeline User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        JobApplication.objects.create(
            user=other_user,
            opportunity=second_opportunity,
            status=JobApplicationStatus.APPLIED,
        )
        self.authenticate("jobs-org@example.com", "StrongPass123!")

        response = self.client.get(
            reverse("job-manage-application-list"),
            {
                "opportunity_id": self.opportunity.id,
                "status": JobApplicationStatus.INTERVIEW,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["opportunity"]["id"], self.opportunity.id)
        self.assertEqual(response.data[0]["status"], JobApplicationStatus.INTERVIEW)

    def test_other_organization_cannot_manage_foreign_applications(self):
        application = JobApplication.objects.create(
            user=self.regular_user,
            opportunity=self.opportunity,
            status=JobApplicationStatus.APPLIED,
        )
        self.authenticate("other-jobs-org@example.com", "StrongPass123!")

        response = self.client.patch(
            reverse("job-manage-application-detail", args=[application.id]),
            {"status": JobApplicationStatus.HIRED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
