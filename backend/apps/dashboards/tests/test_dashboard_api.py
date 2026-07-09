from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import RegularUserProfile
from apps.common.enums import (
    CourseProgramStatus,
    ExperienceLevel,
    FinancialAccountStatus,
    JobApplicationStatus,
    MatchSuggestionType,
    OpportunityStatus,
    OpportunityType,
    OrganizationType,
    OrganizationVerificationReviewStatus,
    RSVPStatus,
    Role,
    SkillDirection,
    SkillSwapStatus,
)
from apps.courses.models import CourseModule, CourseProgram, Enrollment, EnrollmentLessonProgress, LessonItem
from apps.events.models import Event, EventRSVP
from apps.opportunities.models import JobApplication, Opportunity
from apps.organizations.models import Organization, OrganizationVerificationRequest
from apps.payments.models import FinancialAccount
from apps.sessions.models import LearningSession
from apps.skills.models import FieldInterest, Skill, UserFieldInterest, UserSkill
from apps.swaps.models import MatchSuggestion, SkillSwapRequest

User = get_user_model()


class DashboardApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.admin_user = User.objects.create_user(
            email="dashboard-admin@example.com",
            password="StrongPass123!",
            full_name="Dashboard Admin",
            role=Role.ADMIN,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.organization_user = User.objects.create_user(
            email="dashboard-org@example.com",
            password="StrongPass123!",
            full_name="Dashboard Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="Dashboard Org",
            type=OrganizationType.COMPANY,
            description="Publishes learning and events.",
            contact_email="dashboard-org@example.com",
        )
        self.regular_user = User.objects.create_user(
            email="dashboard-user@example.com",
            password="StrongPass123!",
            full_name="Dashboard User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.other_regular_user = User.objects.create_user(
            email="dashboard-peer@example.com",
            password="StrongPass123!",
            full_name="Dashboard Peer",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )

        for user in (self.regular_user, self.other_regular_user):
            RegularUserProfile.objects.create(
                user=user,
                bio=f"{user.full_name} bio",
                interests_summary=f"{user.full_name} interests",
                experience_level=ExperienceLevel.EARLY_CAREER,
            )

        field_interest = FieldInterest.objects.create(name="Product", slug="product")
        offered_skill = Skill.objects.create(name="Python", slug="python")
        learning_skill = Skill.objects.create(name="Design", slug="design")
        UserFieldInterest.objects.create(user=self.regular_user, field_interest=field_interest)
        UserSkill.objects.create(
            user=self.regular_user,
            skill=offered_skill,
            direction=SkillDirection.OFFERING,
        )
        UserSkill.objects.create(
            user=self.regular_user,
            skill=learning_skill,
            direction=SkillDirection.REQUESTING,
        )

        self.course = CourseProgram.objects.create(
            organization=self.organization,
            title="Product Foundations",
            description="Learn product basics.",
            category="Product",
            is_free=True,
            status=CourseProgramStatus.PUBLISHED,
        )
        module = CourseModule.objects.create(
            course_program=self.course,
            title="Module One",
            sort_order=0,
        )
        lesson_one = LessonItem.objects.create(
            module=module,
            title="Intro Lesson",
            item_type="video",
            content_url="https://example.com/video",
            sort_order=0,
        )
        LessonItem.objects.create(
            module=module,
            title="Checklist",
            item_type="checklist",
            checklist_items=["Complete profile"],
            sort_order=1,
        )
        self.enrollment = Enrollment.objects.create(
            user=self.regular_user,
            course_program=self.course,
            status="active",
            progress_percent=50,
        )
        EnrollmentLessonProgress.objects.create(
            enrollment=self.enrollment,
            lesson_item=lesson_one,
            is_completed=True,
            completed_at=timezone.now(),
        )

        self.opportunity = Opportunity.objects.create(
            organization=self.organization,
            title="Frontend Internship",
            description="Support product design systems.",
            type=OpportunityType.INTERNSHIP,
            status=OpportunityStatus.OPEN,
            category="Design",
            location="Remote",
            is_remote=True,
            experience_level=ExperienceLevel.EARLY_CAREER,
            required_skills=["Design"],
            field_signals=["product"],
        )
        self.application = JobApplication.objects.create(
            user=self.regular_user,
            opportunity=self.opportunity,
            status=JobApplicationStatus.SHORTLISTED,
            cover_letter="I would love to join.",
        )

        self.event = Event.objects.create(
            organization=self.organization,
            title="Community Product Meetup",
            description="Networking event.",
            category="Community",
            location="Addis Ababa",
            starts_at=timezone.now() + timedelta(days=7),
            ends_at=timezone.now() + timedelta(days=7, hours=2),
            field_signals=["product"],
            related_skills=["Design"],
        )
        self.rsvp = EventRSVP.objects.create(
            user=self.regular_user,
            event=self.event,
            status=RSVPStatus.GOING,
            attended_at=timezone.now(),
        )

        self.match_suggestion = MatchSuggestion.objects.create(
            source_user=self.regular_user,
            target_user=self.other_regular_user,
            suggestion_type=MatchSuggestionType.DIRECT_SWAP,
            score=88,
            rationale="Good reciprocal match.",
            context_snapshot={
                "can_teach_match": [{"id": offered_skill.id, "name": offered_skill.name}],
                "can_learn_from_match": [{"id": learning_skill.id, "name": learning_skill.name}],
            },
        )
        self.swap_request = SkillSwapRequest.objects.create(
            requester=self.regular_user,
            recipient=self.other_regular_user,
            match_suggestion=self.match_suggestion,
            status=SkillSwapStatus.ACCEPTED,
            message="Let's exchange skills.",
        )
        self.session = LearningSession.objects.create(
            swap_request=self.swap_request,
            created_by=self.regular_user,
            title="Skill Exchange Session",
            status="planned",
            scheduled_start_at=timezone.now() + timedelta(days=3),
            scheduled_end_at=timezone.now() + timedelta(days=3, hours=1),
            meeting_url="https://example.com/session",
        )

        self.verification_request = OrganizationVerificationRequest.objects.create(
            organization=self.organization,
            requested_by=self.organization_user,
            status=OrganizationVerificationReviewStatus.PENDING,
            request_notes="Please verify us.",
        )
        self.financial_account = FinancialAccount.objects.create(
            organization=self.organization,
            status=FinancialAccountStatus.PENDING,
            business_name="Dashboard Org PLC",
            account_holder_name="Dashboard Org",
            bank_name="Dash Bank",
            bank_code="001",
            account_number_last4="4321",
        )

    def authenticate(self, user):
        cache.clear()
        self.client.force_authenticate(user=user)

    def test_regular_user_dashboard_returns_live_activity_and_signals(self):
        self.authenticate(self.regular_user)

        response = self.client.get(reverse("dashboard-regular"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], self.regular_user.email)
        self.assertEqual(response.data["stats"]["active_courses"], 1)
        self.assertEqual(response.data["stats"]["active_swaps"], 1)
        self.assertEqual(response.data["stats"]["upcoming_sessions"], 1)
        self.assertEqual(response.data["applications"][0]["opportunity_title"], self.opportunity.title)
        self.assertEqual(response.data["rsvps"][0]["event_title"], self.event.title)
        self.assertIn("Product", response.data["recommendation_signals"]["profile_fields"])
        self.assertIn("Python", response.data["recommendation_signals"]["offered_skills"])
        self.assertIn("event_attendance", response.data["recommendation_signals"]["activity_signals"])

    def test_organization_dashboard_returns_managed_offerings_and_pipeline_data(self):
        self.authenticate(self.organization_user)

        response = self.client.get(reverse("dashboard-organization"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["organization"]["name"], self.organization.name)
        self.assertEqual(response.data["stats"]["total_courses"], 1)
        self.assertEqual(response.data["stats"]["total_applications"], 1)
        self.assertEqual(response.data["stats"]["total_event_rsvps"], 1)
        self.assertEqual(response.data["financial_account"]["status"], FinancialAccountStatus.PENDING)
        self.assertEqual(response.data["course_performance"][0]["title"], self.course.title)
        self.assertEqual(response.data["applications"][0]["opportunity"]["id"], self.opportunity.id)
        self.assertEqual(response.data["events"][0]["title"], self.event.title)

    def test_admin_dashboard_returns_oversight_queues_and_platform_summary(self):
        self.authenticate(self.admin_user)

        response = self.client.get(reverse("dashboard-admin"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["summary"]["regular_users"], 2)
        self.assertEqual(response.data["summary"]["organizations"], 1)
        self.assertEqual(response.data["oversight"]["pending_verification_requests"], 1)
        self.assertEqual(response.data["oversight"]["pending_financial_accounts"], 1)
        self.assertEqual(response.data["oversight"]["events_from_unverified_organizations"], 1)
        self.assertIn("adaptive_monitoring", response.data)
        self.assertEqual(response.data["adaptive_monitoring"]["active_consents"], 0)
        self.assertEqual(
            response.data["organization_verification_requests"][0]["id"],
            self.verification_request.id,
        )
        self.assertEqual(response.data["financial_accounts"][0]["id"], self.financial_account.id)
        self.assertEqual(response.data["events"][0]["id"], self.event.id)

    def test_dashboard_endpoints_enforce_actor_separation(self):
        self.authenticate(self.organization_user)
        regular_response = self.client.get(reverse("dashboard-regular"))
        admin_response = self.client.get(reverse("dashboard-admin"))

        self.assertEqual(regular_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(admin_response.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.regular_user)
        organization_response = self.client.get(reverse("dashboard-organization"))
        self.assertEqual(organization_response.status_code, status.HTTP_403_FORBIDDEN)
