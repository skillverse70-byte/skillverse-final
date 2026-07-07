from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.enums import EventStatus, OrganizationType, RSVPStatus, Role
from apps.events.models import Event, EventRSVP
from apps.organizations.models import Organization

User = get_user_model()


class EventApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.organization_user = User.objects.create_user(
            email="events-org@example.com",
            password="StrongPass123!",
            full_name="Events Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="Events Org",
            type=OrganizationType.COMPANY,
            description="Publishes events.",
            contact_email="org@example.com",
        )
        self.regular_user = User.objects.create_user(
            email="events-user@example.com",
            password="StrongPass123!",
            full_name="Regular User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.other_regular_user = User.objects.create_user(
            email="other-events-user@example.com",
            password="StrongPass123!",
            full_name="Other User",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.event = Event.objects.create(
            organization=self.organization,
            title="Product Workshop",
            description="A practical workshop.",
            category="Design",
            location="Addis Ababa",
            status=EventStatus.UPCOMING,
            starts_at=timezone.now() + timedelta(days=7),
            ends_at=timezone.now() + timedelta(days=7, hours=2),
            max_attendees=1,
            tags=["design", "product"],
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

    def test_guest_can_list_and_view_public_events(self):
        list_response = self.client.get(reverse("event-list"))
        detail_response = self.client.get(reverse("event-detail", args=[self.event.id]))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["title"], self.event.title)
        self.assertEqual(detail_response.data["organization"]["id"], self.organization.id)
        self.assertEqual(detail_response.data["viewer_rsvp_status"], None)

    def test_organization_can_create_and_manage_events(self):
        self.authenticate("events-org@example.com", "StrongPass123!")

        create_response = self.client.post(
            reverse("event-manage-list-create"),
            {
                "title": "Online Demo Day",
                "description": "A live walkthrough.",
                "category": "Technology",
                "is_online": True,
                "meeting_url": "https://example.com/events/live",
                "status": EventStatus.UPCOMING,
                "starts_at": (timezone.now() + timedelta(days=10)).isoformat(),
                "ends_at": (timezone.now() + timedelta(days=10, hours=1)).isoformat(),
                "rsvp_open": True,
                "tags": ["demo", "community"],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        event_id = create_response.data["id"]

        update_response = self.client.patch(
            reverse("event-manage-detail", args=[event_id]),
            {"location": "Hybrid campus", "is_online": False, "meeting_url": ""},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["location"], "Hybrid campus")
        self.assertFalse(update_response.data["is_online"])

    def test_regular_user_cannot_create_events(self):
        self.authenticate("events-user@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("event-manage-list-create"),
            {
                "title": "Blocked event",
                "starts_at": (timezone.now() + timedelta(days=1)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_can_rsvp_and_list_personal_rsvps(self):
        self.authenticate("events-user@example.com", "StrongPass123!")

        rsvp_response = self.client.post(
            reverse("event-rsvp", args=[self.event.id]),
            {"status": RSVPStatus.GOING},
            format="json",
        )
        list_response = self.client.get(reverse("event-rsvp-list"))
        detail_response = self.client.get(reverse("event-detail", args=[self.event.id]))

        self.assertEqual(rsvp_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["event_id"], self.event.id)
        self.assertEqual(detail_response.data["viewer_rsvp_status"], RSVPStatus.GOING)
        self.assertEqual(EventRSVP.objects.filter(event=self.event, user=self.regular_user).count(), 1)

    def test_only_regular_users_can_rsvp(self):
        self.authenticate("events-org@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("event-rsvp", args=[self.event.id]),
            {"status": RSVPStatus.GOING},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_capacity_is_enforced_for_going_rsvps(self):
        EventRSVP.objects.create(
            event=self.event,
            user=self.regular_user,
            status=RSVPStatus.GOING,
        )
        self.authenticate("other-events-user@example.com", "StrongPass123!")

        response = self.client.post(
            reverse("event-rsvp", args=[self.event.id]),
            {"status": RSVPStatus.GOING},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("full", str(response.data["detail"]).lower())
