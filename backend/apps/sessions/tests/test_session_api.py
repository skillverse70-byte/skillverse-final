from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import RegularUserProfile
from apps.common.enums import ExperienceLevel, MatchSuggestionType, Role, SkillDirection, SkillSwapStatus
from apps.skills.models import Skill, UserSkill
from apps.swaps.models import MatchSuggestion, SkillSwapRequest

User = get_user_model()


class LearningSessionApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.requester = User.objects.create_user(
            email="session-requester@example.com",
            password="StrongPass123!",
            full_name="Requester User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.recipient = User.objects.create_user(
            email="session-recipient@example.com",
            password="StrongPass123!",
            full_name="Recipient User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.third_user = User.objects.create_user(
            email="session-third@example.com",
            password="StrongPass123!",
            full_name="Third User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )

        for user in (self.requester, self.recipient, self.third_user):
            RegularUserProfile.objects.create(
                user=user,
                bio=f"{user.full_name} bio",
                interests_summary=f"{user.full_name} interests",
                experience_level=ExperienceLevel.EARLY_CAREER,
            )

        python_skill = Skill.objects.create(name="Python Session", slug="python-session")
        design_skill = Skill.objects.create(name="Design Session", slug="design-session")
        UserSkill.objects.create(user=self.requester, skill=python_skill, direction=SkillDirection.OFFERING)
        UserSkill.objects.create(user=self.requester, skill=design_skill, direction=SkillDirection.REQUESTING)
        UserSkill.objects.create(user=self.recipient, skill=design_skill, direction=SkillDirection.OFFERING)
        UserSkill.objects.create(user=self.recipient, skill=python_skill, direction=SkillDirection.REQUESTING)

        self.match_suggestion = MatchSuggestion.objects.create(
            source_user=self.requester,
            target_user=self.recipient,
            suggestion_type=MatchSuggestionType.DIRECT_SWAP,
            score=120,
            rationale="Session test match.",
            context_snapshot={},
        )
        self.accepted_swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            match_suggestion=self.match_suggestion,
            status=SkillSwapStatus.ACCEPTED,
            message="Let's plan a session.",
        )
        self.pending_swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            match_suggestion=self.match_suggestion,
            status=SkillSwapStatus.PENDING,
            message="Pending swap.",
        )

    def authenticate(self, user, password="StrongPass123!"):
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": password},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

    def test_participant_can_plan_learning_session_for_accepted_swap(self):
        self.authenticate(self.requester)

        response = self.client.post(
            reverse("learning-sessions"),
            {
                "swap_request_id": self.accepted_swap_request.id,
                "title": "Python for Designers",
                "description": "First swap session",
                "scheduled_start_at": "2026-07-10T15:00:00Z",
                "scheduled_end_at": "2026-07-10T16:00:00Z",
                "timezone": "Africa/Nairobi",
                "meeting_url": "https://meet.example.com/skillverse",
                "meeting_notes": "Join five minutes early.",
                "location_note": "External call",
                "metadata": {"delivery_mode": "external_link"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["swap_request"], self.accepted_swap_request.id)
        self.assertEqual(response.data["status"], "planned")
        self.assertEqual(response.data["participants"][0]["id"], self.requester.id)
        self.assertEqual(response.data["participants"][1]["id"], self.recipient.id)
        self.assertEqual(response.data["metadata"]["delivery_mode"], "external_link")

    def test_session_creation_rejected_for_pending_swap(self):
        self.authenticate(self.requester)

        response = self.client.post(
            reverse("learning-sessions"),
            {
                "swap_request_id": self.pending_swap_request.id,
                "title": "Blocked session",
                "scheduled_start_at": "2026-07-10T15:00:00Z",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("accepted", str(response.data).lower())

    def test_non_participant_cannot_view_learning_session(self):
        self.authenticate(self.requester)
        create_response = self.client.post(
            reverse("learning-sessions"),
            {
                "swap_request_id": self.accepted_swap_request.id,
                "title": "Private session",
                "scheduled_start_at": "2026-07-10T15:00:00Z",
            },
            format="json",
        )
        session_id = create_response.data["id"]

        self.authenticate(self.third_user)
        response = self.client.get(reverse("learning-session-detail", args=[session_id]))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not found", str(response.data).lower())

    def test_participant_can_mark_learning_session_completed(self):
        self.authenticate(self.requester)
        create_response = self.client.post(
            reverse("learning-sessions"),
            {
                "swap_request_id": self.accepted_swap_request.id,
                "title": "Complete me",
                "scheduled_start_at": "2026-07-10T15:00:00Z",
            },
            format="json",
        )
        session_id = create_response.data["id"]

        response = self.client.patch(
            reverse("learning-session-detail", args=[session_id]),
            {
                "status": "completed",
                "completion_notes": "Covered Python basics and shared follow-up resources.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "completed")
        self.assertIsNotNone(response.data["completed_at"])
        self.assertEqual(
            response.data["completion_notes"],
            "Covered Python basics and shared follow-up resources.",
        )
