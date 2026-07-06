from asgiref.sync import async_to_sync
from channels.db import database_sync_to_async
from channels.testing.websocket import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import RegularUserProfile
from apps.common.enums import ExperienceLevel, MatchSuggestionType, Role, SkillDirection, SkillSwapStatus
from apps.messaging.services import create_thread_message, ensure_message_thread_for_swap_request
from apps.skills.models import Skill, UserSkill
from apps.swaps.models import MatchSuggestion, SkillSwapRequest
from config.asgi import application

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
        self.assertEqual(create_response.data["unread_count"], 0)
        self.assertFalse(create_response.data["has_unread"])
        self.assertIsNone(create_response.data["last_read_message_id"])

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

    def test_thread_list_includes_server_side_unread_count_for_recipient(self):
        thread = ensure_message_thread_for_swap_request(
            swap_request=self.accepted_swap_request,
            created_by=self.requester,
        )
        create_thread_message(
            thread=thread,
            sender=self.requester,
            content="First unread",
        )
        create_thread_message(
            thread=thread,
            sender=self.requester,
            content="Second unread",
        )

        self.authenticate(self.recipient)
        response = self.client.get(reverse("message-threads"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["unread_count"], 2)
        self.assertTrue(response.data[0]["has_unread"])
        self.assertIsNone(response.data[0]["last_read_message_id"])

    def test_participant_can_mark_thread_as_read(self):
        thread = ensure_message_thread_for_swap_request(
            swap_request=self.accepted_swap_request,
            created_by=self.requester,
        )
        first_message = create_thread_message(
            thread=thread,
            sender=self.requester,
            content="First unread",
        )
        second_message = create_thread_message(
            thread=thread,
            sender=self.requester,
            content="Second unread",
        )

        self.authenticate(self.recipient)
        response = self.client.post(reverse("thread-read-receipt", args=[thread.id]), format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["thread_id"], thread.id)
        self.assertEqual(response.data["unread_count"], 0)
        self.assertFalse(response.data["has_unread"])
        self.assertEqual(response.data["last_read_message_id"], second_message.id)
        self.assertIsNotNone(response.data["last_read_at"])

        list_response = self.client.get(reverse("message-threads"))
        self.assertEqual(list_response.data[0]["unread_count"], 0)
        self.assertFalse(list_response.data[0]["has_unread"])
        self.assertEqual(list_response.data[0]["last_read_message_id"], second_message.id)
        self.assertNotEqual(first_message.id, second_message.id)

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


class MessagingRealtimeTests(TransactionTestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.requester = User.objects.create_user(
            email="rt-requester@example.com",
            password="StrongPass123!",
            full_name="Requester User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.recipient = User.objects.create_user(
            email="rt-recipient@example.com",
            password="StrongPass123!",
            full_name="Recipient User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.third_user = User.objects.create_user(
            email="rt-third@example.com",
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

        python_skill = Skill.objects.create(name="Python RT", slug="python-rt")
        design_skill = Skill.objects.create(name="Design RT", slug="design-rt")
        UserSkill.objects.create(user=self.requester, skill=python_skill, direction=SkillDirection.OFFERING)
        UserSkill.objects.create(user=self.requester, skill=design_skill, direction=SkillDirection.REQUESTING)
        UserSkill.objects.create(user=self.recipient, skill=design_skill, direction=SkillDirection.OFFERING)
        UserSkill.objects.create(user=self.recipient, skill=python_skill, direction=SkillDirection.REQUESTING)

        self.match_suggestion = MatchSuggestion.objects.create(
            source_user=self.requester,
            target_user=self.recipient,
            suggestion_type=MatchSuggestionType.DIRECT_SWAP,
            score=120,
            rationale="Realtime test match.",
            context_snapshot={},
        )
        self.accepted_swap_request = SkillSwapRequest.objects.create(
            requester=self.requester,
            recipient=self.recipient,
            match_suggestion=self.match_suggestion,
            status=SkillSwapStatus.ACCEPTED,
            message="Let's coordinate our realtime swap.",
        )
        self.thread = ensure_message_thread_for_swap_request(
            swap_request=self.accepted_swap_request,
            created_by=self.requester,
        )
        self.requester_token = str(RefreshToken.for_user(self.requester).access_token)
        self.recipient_token = str(RefreshToken.for_user(self.recipient).access_token)
        self.third_user_token = str(RefreshToken.for_user(self.third_user).access_token)

    @database_sync_to_async
    def create_realtime_message(self, *, sender, content):
        return create_thread_message(
            thread=self.thread,
            sender=sender,
            content=content,
        )

    def test_participant_can_connect_to_thread_socket(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                application,
                f"/ws/messages/threads/{self.thread.id}/?token={self.requester_token}",
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            ready_event = await communicator.receive_json_from()
            self.assertEqual(ready_event["type"], "connection.ready")
            self.assertEqual(ready_event["thread_id"], self.thread.id)
            await communicator.disconnect()

        async_to_sync(scenario)()

    def test_non_participant_is_rejected_from_thread_socket(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                application,
                f"/ws/messages/threads/{self.thread.id}/?token={self.third_user_token}",
            )
            connected, _ = await communicator.connect()
            self.assertFalse(connected)

        async_to_sync(scenario)()

    def test_new_thread_message_is_broadcast_to_connected_participant(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                application,
                f"/ws/messages/threads/{self.thread.id}/?token={self.recipient_token}",
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            await communicator.receive_json_from()

            await self.create_realtime_message(
                sender=self.requester,
                content="Realtime hello",
            )

            event = await communicator.receive_json_from()
            self.assertEqual(event["type"], "thread.message.created")
            self.assertEqual(event["thread_id"], self.thread.id)
            self.assertEqual(event["message"]["content"], "Realtime hello")
            self.assertEqual(event["message"]["sender"]["id"], self.requester.id)
            await communicator.disconnect()

        async_to_sync(scenario)()

    def test_inbox_socket_receives_unread_summary_updates(self):
        async def scenario():
            communicator = WebsocketCommunicator(
                application,
                f"/ws/messages/inbox/?token={self.recipient_token}",
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)

            ready_event = await communicator.receive_json_from()
            self.assertEqual(ready_event["type"], "connection.ready")
            self.assertEqual(ready_event["summary"]["total_unread_count"], 0)
            self.assertEqual(ready_event["summary"]["unread_thread_count"], 0)

            await self.create_realtime_message(
                sender=self.requester,
                content="Unread update",
            )

            update_event = await communicator.receive_json_from()
            self.assertEqual(update_event["type"], "messages.unread.updated")
            self.assertEqual(update_event["summary"]["total_unread_count"], 1)
            self.assertEqual(update_event["summary"]["unread_thread_count"], 1)
            await communicator.disconnect()

        async_to_sync(scenario)()
