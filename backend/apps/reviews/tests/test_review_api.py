from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import RegularUserProfile
from apps.common.enums import (
    CourseProgramStatus,
    EnrollmentStatus,
    EventStatus,
    ExperienceLevel,
    MatchSuggestionType,
    ReviewContext,
    Role,
    SkillDirection,
    SkillSwapStatus,
)
from apps.courses.models import CourseProgram, Enrollment
from apps.events.models import Event, EventRSVP
from apps.organizations.models import Organization
from apps.sessions.models import LearningSession
from apps.skills.models import Skill, UserSkill
from apps.swaps.models import MatchSuggestion, SkillSwapRequest

User = get_user_model()


class ReviewApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.requester = User.objects.create_user(
            email="review-requester@example.com",
            password="StrongPass123!",
            full_name="Requester User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.recipient = User.objects.create_user(
            email="review-recipient@example.com",
            password="StrongPass123!",
            full_name="Recipient User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.organization_owner = User.objects.create_user(
            email="review-org@example.com",
            password="StrongPass123!",
            full_name="Review Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )

        for user in (self.requester, self.recipient):
            RegularUserProfile.objects.create(
                user=user,
                bio=f"{user.full_name} bio",
                interests_summary=f"{user.full_name} interests",
                experience_level=ExperienceLevel.EARLY_CAREER,
            )

        self.organization = Organization.objects.create(
            owner=self.organization_owner,
            name="Review Academy",
            type="institution",
            description="Org",
            contact_email="org@example.com",
        )

        python_skill = Skill.objects.create(name="Python Review", slug="python-review")
        design_skill = Skill.objects.create(name="Design Review", slug="design-review")
        UserSkill.objects.create(user=self.requester, skill=python_skill, direction=SkillDirection.OFFERING)
        UserSkill.objects.create(user=self.requester, skill=design_skill, direction=SkillDirection.REQUESTING)
        UserSkill.objects.create(user=self.recipient, skill=design_skill, direction=SkillDirection.OFFERING)
        UserSkill.objects.create(user=self.recipient, skill=python_skill, direction=SkillDirection.REQUESTING)

        self.match_suggestion = MatchSuggestion.objects.create(
            source_user=self.requester,
            target_user=self.recipient,
            suggestion_type=MatchSuggestionType.DIRECT_SWAP,
            score=120,
            rationale="Review test match.",
            context_snapshot={},
        )
        self.swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            match_suggestion=self.match_suggestion,
            status=SkillSwapStatus.ACCEPTED,
            message="Let's review after completion.",
        )
        self.session = LearningSession.objects.create(
            swap_request=self.swap_request,
            created_by=self.requester,
            title="Completed swap session",
            status="completed",
            scheduled_start_at=timezone.now(),
            completed_at=timezone.now(),
        )

        self.course_program = CourseProgram.objects.create(
            organization=self.organization,
            title="Python 101",
            description="Course",
            status=CourseProgramStatus.PUBLISHED,
        )
        self.completed_enrollment = Enrollment.objects.create(
            user=self.requester,
            course_program=self.course_program,
            status=EnrollmentStatus.COMPLETED,
            progress_percent=100,
            completed_at=timezone.now(),
        )
        self.pending_enrollment = Enrollment.objects.create(
            user=self.recipient,
            course_program=self.course_program,
            status=EnrollmentStatus.ACTIVE,
            progress_percent=40,
        )

        self.event = Event.objects.create(
            organization=self.organization,
            title="Demo Day",
            description="Event",
            status=EventStatus.COMPLETED,
            starts_at=timezone.now(),
            ends_at=timezone.now(),
        )
        self.attended_rsvp = EventRSVP.objects.create(
            user=self.requester,
            event=self.event,
            status="going",
            attended_at=timezone.now(),
        )
        self.pending_rsvp = EventRSVP.objects.create(
            user=self.recipient,
            event=self.event,
            status="going",
        )

    def authenticate(self, user, password="StrongPass123!"):
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": password},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

    def test_completed_swap_participant_is_eligible_to_review(self):
        self.authenticate(self.requester)
        response = self.client.get(
            reverse("review-eligibility"),
            {"context": ReviewContext.SKILL_SWAP, "source_id": self.swap_request.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["eligible"])
        self.assertEqual(response.data["target"]["id"], self.recipient.id)

    def test_completed_course_enrollment_is_eligible_to_review(self):
        self.authenticate(self.requester)
        response = self.client.get(
            reverse("review-eligibility"),
            {"context": ReviewContext.COURSE, "source_id": self.completed_enrollment.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["eligible"])
        self.assertEqual(response.data["target"]["id"], self.course_program.id)

    def test_only_attended_event_rsvp_is_eligible_to_review(self):
        self.authenticate(self.recipient)
        response = self.client.get(
            reverse("review-eligibility"),
            {"context": ReviewContext.EVENT, "source_id": self.pending_rsvp.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["eligible"])
        self.assertIn("attendance", response.data["reason"].lower())

    def test_participant_can_create_skill_swap_review_once(self):
        self.authenticate(self.requester)
        create_response = self.client.post(
            reverse("rating-review-create"),
            {
                "context": ReviewContext.SKILL_SWAP,
                "source_id": self.swap_request.id,
                "rating": 5,
                "comment": "Helpful and easy to learn from.",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["context"], ReviewContext.SKILL_SWAP)
        self.assertEqual(create_response.data["target"]["id"], self.recipient.id)

        second_response = self.client.post(
            reverse("rating-review-create"),
            {
                "context": ReviewContext.SKILL_SWAP,
                "source_id": self.swap_request.id,
                "rating": 4,
                "comment": "Duplicate",
            },
            format="json",
        )
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_participant_can_create_course_and_event_reviews(self):
        self.authenticate(self.requester)

        course_response = self.client.post(
            reverse("rating-review-create"),
            {
                "context": ReviewContext.COURSE,
                "source_id": self.completed_enrollment.id,
                "rating": 4,
                "comment": "Clear structure.",
            },
            format="json",
        )
        self.assertEqual(course_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(course_response.data["target"]["id"], self.course_program.id)

        event_response = self.client.post(
            reverse("rating-review-create"),
            {
                "context": ReviewContext.EVENT,
                "source_id": self.attended_rsvp.id,
                "rating": 5,
                "comment": "Strong event experience.",
            },
            format="json",
        )
        self.assertEqual(event_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(event_response.data["target"]["id"], self.event.id)
