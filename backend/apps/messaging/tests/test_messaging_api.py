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


class MessagingApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.requester = User.objects.create_user(
            email="message-requester@example.com",
            password="StrongPass123!",
            full_name="Requester User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.recipient = User.objects.create_user(
            email="message-recipient@example.com",
            password="StrongPass123!",
            full_name="Recipient User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.third_user = User.objects.create_user(
            email="message-third@example.com",
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

        python_skill = Skill.objects.create(name="Python", slug="python")
        design_skill = Skill.objects.create(name="Design", slug="design")
        UserSkill.objects.create(user=self.requester, skill=python_skill, direction=SkillDirection.OFFERING)
        UserSkill.objects.create(user=self.requester, skill=design_skill, direction=SkillDirection.REQUESTING)
        UserSkill.objects.create(user=self.recipient, skill=design_skill, direction=SkillDirection.OFFERING)
        UserSkill.objects.create(user=self.recipient, skill=python_skill, direction=SkillDirection.REQUESTING)

        self.match_suggestion = MatchSuggestion.objects.create(
            source_user=self.requester,
            target_user=self.recipient,
            suggestion_type=MatchSuggestionType.DIRECT_SWAP,
            score=120,
            rationale="You can learn Design and teach Python.",
            context_snapshot={
                "target_user": {
                    "id": self.recipient.id,
                    "full_name": self.recipient.full_name,
                    "bio": "Recipient User bio",
                    "interests_summary": "Recipient User interests",
                    "experience_level": ExperienceLevel.EARLY_CAREER,
                },
                "can_learn_from_match": [
                    {"id": design_skill.id, "name": design_skill.name, "slug": design_skill.slug}
                ],
                "can_teach_match": [
                    {"id": python_skill.id, "name": python_skill.name, "slug": python_skill.slug}
                ],
            },
        )

        self.accepted_swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            match_suggestion=self.match_suggestion,
            status=SkillSwapStatus.ACCEPTED,
            message="Let's coordinate our swap.",
        )
        self.pending_swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            match_suggestion=self.match_suggestion,
            status=SkillSwapStatus.PENDING,
            message="Pending until accepted.",
        )

    def authenticate(self, user, password="StrongPass123!"):
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": password},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

    def test_participant_can_create_and_list_message_thread_for_accepted_swap(self):
        self.authenticate(self.requester)

        create_response = self.client.post(
            reverse("message-threads"),
            {"swap_request_id": self.accepted_swap_request.id},
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["swap_request"], self.accepted_swap_request.id)
        self.assertEqual(create_response.data["counterparty"]["id"], self.recipient.id)
        self.assertIn("teach Python", create_response.data["exchange_summary"])

        list_response = self.client.get(reverse("message-threads"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

    def test_thread_creation_is_rejected_for_pending_swap(self):
        self.authenticate(self.requester)

        response = self.client.post(
            reverse("message-threads"),
            {"swap_request_id": self.pending_swap_request.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("accepted", str(response.data).lower())

    def test_participant_can_send_text_message(self):
        self.authenticate(self.requester)
        thread_response = self.client.post(
            reverse("message-threads"),
            {"swap_request_id": self.accepted_swap_request.id},
            format="json",
        )
        thread_id = thread_response.data["id"]

        message_response = self.client.post(
            reverse("thread-messages", args=[thread_id]),
            {"content": "Hi, I can do Tuesday evening."},
            format="json",
        )

        self.assertEqual(message_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(message_response.data["message_type"], "text")
        self.assertEqual(message_response.data["sender"]["id"], self.requester.id)

    def test_participant_can_share_resource_link_in_thread(self):
        self.authenticate(self.requester)
        thread_response = self.client.post(
            reverse("message-threads"),
            {"swap_request_id": self.accepted_swap_request.id},
            format="json",
        )
        thread_id = thread_response.data["id"]

        message_response = self.client.post(
            reverse("thread-messages", args=[thread_id]),
            {
                "resource_url": "https://example.com/react-notes",
                "resource_label": "React notes",
            },
            format="json",
        )

        self.assertEqual(message_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(message_response.data["message_type"], "resource")
        self.assertEqual(message_response.data["resource_label"], "React notes")

    def test_non_participant_cannot_access_thread(self):
        self.authenticate(self.requester)
        thread_response = self.client.post(
            reverse("message-threads"),
            {"swap_request_id": self.accepted_swap_request.id},
            format="json",
        )
        thread_id = thread_response.data["id"]

        self.authenticate(self.third_user)
        response = self.client.get(reverse("message-thread-detail", args=[thread_id]))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not found", str(response.data).lower())
