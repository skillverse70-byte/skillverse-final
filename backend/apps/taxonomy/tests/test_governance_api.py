from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
from apps.common.enums import (
    CourseProgramStatus,
    EventStatus,
    OpportunityStatus,
    OrganizationType,
    Role,
    TaxonomyDomain,
    TaxonomySuggestionStatus,
)
from apps.courses.models import CourseProgram
from apps.events.models import Event
from apps.opportunities.models import Opportunity
from apps.organizations.models import Organization
from apps.skills.models import FieldInterest, Skill
from apps.taxonomy.models import ManagedCategory

User = get_user_model()


class GovernanceApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        verified_at = timezone.now()

        self.admin_user = User.objects.create_user(
            email="governance-admin@example.com",
            password="StrongPass123!",
            full_name="Governance Admin",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at=verified_at,
        )
        self.regular_user = User.objects.create_user(
            email="governance-user@example.com",
            password="StrongPass123!",
            full_name="Regular User",
            role=Role.REGULAR_USER,
            email_verified_at=verified_at,
        )
        self.organization_user = User.objects.create_user(
            email="governance-org@example.com",
            password="StrongPass123!",
            full_name="Organization Owner",
            role=Role.ORGANIZATION,
            email_verified_at=verified_at,
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="Governance Org",
            type=OrganizationType.COMPANY,
            description="Creates courses and jobs.",
            contact_email="governance-org@example.com",
            verification_status="verified",
        )
        self.course = CourseProgram.objects.create(
            organization=self.organization,
            title="Governance Course",
            category="Operations",
            status=CourseProgramStatus.PUBLISHED,
            enrollment_open=True,
        )
        self.opportunity = Opportunity.objects.create(
            organization=self.organization,
            title="Operations Analyst",
            description="Help run platform operations.",
            status=OpportunityStatus.OPEN,
            location="Remote",
            is_remote=True,
        )
        self.event = Event.objects.create(
            organization=self.organization,
            title="Moderation Townhall",
            status=EventStatus.UPCOMING,
            starts_at=timezone.now() + timedelta(days=3),
            category="Community",
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_regular_users_and_organizations_can_submit_suggestions_and_admin_can_review(self):
        self.authenticate(self.regular_user)
        regular_response = self.client.post(
            reverse("taxonomy-suggestion-list-create"),
            {
                "domain": TaxonomyDomain.SKILL,
                "name": "Product Discovery",
                "description": "Useful for mentorship flows.",
            },
            format="json",
        )
        self.assertEqual(regular_response.status_code, status.HTTP_201_CREATED)

        self.authenticate(self.organization_user)
        organization_response = self.client.post(
            reverse("taxonomy-suggestion-list-create"),
            {
                "domain": TaxonomyDomain.COURSE_CATEGORY,
                "name": "Service Design",
                "description": "Programs around service operations.",
            },
            format="json",
        )
        self.assertEqual(organization_response.status_code, status.HTTP_201_CREATED)

        self.authenticate(self.admin_user)
        list_response = self.client.get(
            reverse("admin-taxonomy-suggestion-list"),
            {"status": TaxonomySuggestionStatus.PENDING},
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 2)

        approve_skill_response = self.client.post(
            reverse("admin-taxonomy-suggestion-decision", args=[regular_response.data["id"]]),
            {"decision": TaxonomySuggestionStatus.APPROVED, "reviewer_notes": "Fits the catalog."},
            format="json",
        )
        self.assertEqual(approve_skill_response.status_code, status.HTTP_200_OK)
        self.assertTrue(Skill.objects.filter(name="Product Discovery", is_active=True).exists())

        approve_category_response = self.client.post(
            reverse("admin-taxonomy-suggestion-decision", args=[organization_response.data["id"]]),
            {"decision": TaxonomySuggestionStatus.APPROVED},
            format="json",
        )
        self.assertEqual(approve_category_response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            ManagedCategory.objects.filter(
                domain=TaxonomyDomain.COURSE_CATEGORY,
                name="Service Design",
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action="taxonomy.suggestion.reviewed",
                target_id=regular_response.data["id"],
            ).exists()
        )

    def test_admin_can_manage_catalog_entries_across_domains(self):
        FieldInterest.objects.create(name="Climate", slug="climate", is_active=True)

        self.authenticate(self.admin_user)
        create_response = self.client.post(
            reverse("admin-taxonomy-catalog-list-create"),
            {
                "domain": TaxonomyDomain.EVENT_CATEGORY,
                "name": "Policy Roundtable",
                "description": "Curated event taxonomy entry.",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        field_interest = FieldInterest.objects.get(slug="climate")
        update_response = self.client.patch(
            reverse("admin-taxonomy-catalog-detail", args=[TaxonomyDomain.FIELD_INTEREST, field_interest.id]),
            {"is_active": False, "name": "Climate Systems"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        field_interest.refresh_from_db()
        self.assertFalse(field_interest.is_active)
        self.assertEqual(field_interest.name, "Climate Systems")

        public_catalog_response = self.client.get(
            reverse("taxonomy-catalog-list"),
            {"domain": TaxonomyDomain.EVENT_CATEGORY},
        )
        self.assertEqual(public_catalog_response.status_code, status.HTTP_200_OK)
        self.assertEqual(public_catalog_response.data[0]["name"], "Policy Roundtable")

    def test_admin_can_moderate_users_organizations_courses_and_jobs(self):
        self.authenticate(self.admin_user)

        user_response = self.client.post(
            reverse("admin-user-decision", args=[self.regular_user.id]),
            {"is_active": False, "reason": "Repeated abuse reports."},
            format="json",
        )
        organization_response = self.client.post(
            reverse("admin-organization-moderation-decision", args=[self.organization.id]),
            {"is_suspended": True, "suspension_reason": "Trust review in progress."},
            format="json",
        )
        course_response = self.client.post(
            reverse("admin-course-decision", args=[self.course.id]),
            {
                "status": CourseProgramStatus.ARCHIVED,
                "enrollment_open": False,
                "review_notes": "Archived pending review.",
            },
            format="json",
        )
        job_response = self.client.post(
            reverse("admin-job-decision", args=[self.opportunity.id]),
            {
                "status": OpportunityStatus.CLOSED,
                "review_notes": "Closed while policy review completes.",
            },
            format="json",
        )

        self.assertEqual(user_response.status_code, status.HTTP_200_OK)
        self.assertEqual(organization_response.status_code, status.HTTP_200_OK)
        self.assertEqual(course_response.status_code, status.HTTP_200_OK)
        self.assertEqual(job_response.status_code, status.HTTP_200_OK)

        self.regular_user.refresh_from_db()
        self.organization.refresh_from_db()
        self.course.refresh_from_db()
        self.opportunity.refresh_from_db()

        self.assertFalse(self.regular_user.is_active)
        self.assertTrue(self.organization.is_suspended)
        self.assertEqual(self.course.status, CourseProgramStatus.ARCHIVED)
        self.assertFalse(self.course.enrollment_open)
        self.assertEqual(self.opportunity.status, OpportunityStatus.CLOSED)
        self.assertTrue(
            AuditLog.objects.filter(action="account.admin.moderated", target_id=self.regular_user.id).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(action="organization.admin.moderated", target_id=self.organization.id).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(action="course.admin.reviewed", target_id=self.course.id).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(action="opportunity.admin.reviewed", target_id=self.opportunity.id).exists()
        )

    def test_suspended_organization_content_is_hidden_from_public_and_manage_routes(self):
        self.organization.is_suspended = True
        self.organization.suspension_reason = "Suspended by admin."
        self.organization.save(update_fields=["is_suspended", "suspension_reason", "updated_at"])

        public_course_list = self.client.get(reverse("course-list"))
        public_course_detail = self.client.get(reverse("course-detail", args=[self.course.id]))
        public_job_list = self.client.get(reverse("job-list"))
        public_job_detail = self.client.get(reverse("job-detail", args=[self.opportunity.id]))
        public_event_list = self.client.get(reverse("event-list"))
        public_event_detail = self.client.get(reverse("event-detail", args=[self.event.id]))

        self.assertEqual(public_course_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(public_course_list.data), 0)
        self.assertEqual(public_course_detail.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(len(public_job_list.data), 0)
        self.assertEqual(public_job_detail.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(len(public_event_list.data), 0)
        self.assertEqual(public_event_detail.status_code, status.HTTP_404_NOT_FOUND)

        self.authenticate(self.organization_user)
        manage_courses_response = self.client.get(reverse("course-manage-list-create"))
        manage_jobs_response = self.client.get(reverse("job-manage-list-create"))
        manage_events_response = self.client.get(reverse("event-manage-list-create"))

        self.assertEqual(manage_courses_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(manage_jobs_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(manage_events_response.status_code, status.HTTP_403_FORBIDDEN)
