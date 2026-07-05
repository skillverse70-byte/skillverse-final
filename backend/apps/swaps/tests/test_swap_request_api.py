from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import RegularUserProfile
from apps.common.enums import ExperienceLevel, MatchSuggestionType, Role, SkillDirection, SkillSwapStatus
from apps.skills.models import Skill, UserSkill
from apps.swaps.models import MatchSuggestion, SkillSwapRequest

User = get_user_model()


class SkillSwapRequestApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.requester = User.objects.create_user(
            email="requester@example.com",
            password="StrongPass123!",
            full_name="Requester User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        self.recipient = User.objects.create_user(
            email="recipient@example.com",
            password="StrongPass123!",
            full_name="Recipient User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        self.third_user = User.objects.create_user(
            email="third@example.com",
            password="StrongPass123!",
            full_name="Third User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-05T00:00:00Z",
        )
        self.organization_user = User.objects.create_user(
            email="org@example.com",
            password="StrongPass123!",
            full_name="Org Actor",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-05T00:00:00Z",
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

    def authenticate(self, user, password="StrongPass123!"):
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": password},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )

    def test_requester_can_create_and_list_swap_request_with_history(self):
        self.authenticate(self.requester)

        with self.captureOnCommitCallbacks(execute=True):
            create_response = self.client.post(
                reverse("swap-requests"),
                {
                    "recipient_user_id": self.recipient.id,
                    "match_suggestion_id": self.match_suggestion.id,
                    "message": "Would you like to swap Python for Design?",
                    "requester_note": "Available evenings this week.",
                },
                format="json",
            )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["status"], SkillSwapStatus.PENDING)
        self.assertEqual(create_response.data["counterparty"]["id"], self.recipient.id)
        self.assertEqual(
            [skill["name"] for skill in create_response.data["my_teaching_skills"]],
            ["Python"],
        )
        self.assertEqual(
            [skill["name"] for skill in create_response.data["my_learning_skills"]],
            ["Design"],
        )
        self.assertIn("teach Python", create_response.data["exchange_summary"])
        self.assertEqual(len(create_response.data["status_history"]), 1)
        self.assertTrue(create_response.data["can_cancel"])
        self.assertEqual(mail.outbox[-1].to, [self.recipient.email])
        self.assertIn("swap request", mail.outbox[-1].subject.lower())
        self.assertIn("dashboard?tab=swaps", mail.outbox[-1].body)
        self.assertEqual(len(mail.outbox[-1].alternatives), 1)
        self.assertIn("text/html", mail.outbox[-1].alternatives[0].mimetype)

        list_response = self.client.get(reverse("swap-requests"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

    def test_recipient_can_accept_and_history_is_recorded(self):
        swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            match_suggestion=self.match_suggestion,
            status=SkillSwapStatus.PENDING,
            message="Let's swap.",
        )
        swap_request.status_history.create(
            from_status="",
            to_status=SkillSwapStatus.PENDING,
            changed_by=self.requester,
            note="Created",
        )

        self.authenticate(self.recipient)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("swap-request-accept", args=[swap_request.id]),
                {"note": "Accepted. Let's coordinate a time."},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], SkillSwapStatus.ACCEPTED)
        self.assertEqual(
            [skill["name"] for skill in response.data["my_teaching_skills"]],
            ["Design"],
        )
        self.assertEqual(
            [skill["name"] for skill in response.data["my_learning_skills"]],
            ["Python"],
        )
        self.assertEqual(len(response.data["status_history"]), 2)
        self.assertTrue(response.data["status_history"][-1]["note"].startswith("Accepted"))
        self.assertEqual(mail.outbox[-1].to, [self.requester.email])
        self.assertIn("accepted", mail.outbox[-1].subject.lower())
        self.assertIn("dashboard?tab=swaps", mail.outbox[-1].body)
        self.assertEqual(len(mail.outbox[-1].alternatives), 1)

    def test_recipient_can_reject_pending_request(self):
        swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            status=SkillSwapStatus.PENDING,
        )
        swap_request.status_history.create(
            from_status="",
            to_status=SkillSwapStatus.PENDING,
            changed_by=self.requester,
            note="Created",
        )

        self.authenticate(self.recipient)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse("swap-request-reject", args=[swap_request.id]),
                {"note": "Not a good time for me right now."},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], SkillSwapStatus.REJECTED)
        self.assertEqual(mail.outbox[-1].to, [self.requester.email])
        self.assertIn("declined", mail.outbox[-1].subject.lower())
        self.assertIn("dashboard?tab=swaps", mail.outbox[-1].body)
        self.assertEqual(len(mail.outbox[-1].alternatives), 1)

    def test_requester_can_cancel_pending_request(self):
        swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            status=SkillSwapStatus.PENDING,
        )
        swap_request.status_history.create(
            from_status="",
            to_status=SkillSwapStatus.PENDING,
            changed_by=self.requester,
            note="Created",
        )

        self.authenticate(self.requester)
        response = self.client.post(
            reverse("swap-request-cancel", args=[swap_request.id]),
            {"note": "Need to pause this for now."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], SkillSwapStatus.CANCELLED)

    def test_recipient_cannot_accept_non_pending_request(self):
        swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            status=SkillSwapStatus.CANCELLED,
        )

        self.authenticate(self.recipient)
        response = self.client.post(
            reverse("swap-request-accept", args=[swap_request.id]),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_active_swap_request_is_rejected(self):
        SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            status=SkillSwapStatus.PENDING,
        )

        self.authenticate(self.requester)
        response = self.client.post(
            reverse("swap-requests"),
            {
                "recipient_user_id": self.recipient.id,
                "message": "Trying again.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("active", str(response.data).lower())

    def test_regular_user_cannot_create_swap_with_self(self):
        self.authenticate(self.requester)
        response = self.client.post(
            reverse("swap-requests"),
            {
                "recipient_user_id": self.requester.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_organization_actor_cannot_manage_swap_requests(self):
        self.authenticate(self.organization_user)
        response = self.client.get(reverse("swap-requests"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
