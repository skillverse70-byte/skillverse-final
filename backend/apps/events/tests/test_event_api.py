from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
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
        self.other_organization_user = User.objects.create_user(
            email="other-events-org@example.com",
            password="StrongPass123!",
            full_name="Other Events Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.other_organization = Organization.objects.create(
            owner=self.other_organization_user,
            name="Other Events Org",
            type=OrganizationType.NGO,
            description="Separate event publisher.",
            contact_email="other-events-org@example.com",
        )
        self.admin_user = User.objects.create_user(
            email="events-admin@example.com",
            password="StrongPass123!",
            full_name="Events Admin",
            role=Role.ADMIN,
            email_verified_at="2026-07-06T00:00:00Z",
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
            field_signals=["design"],
            related_skills=["facilitation", "product thinking"],
            related_course_ids=[101],
            participation_signals=["community", "workshop_attendance"],
        )

    def authenticate(self, email, password):
        cache.clear()
        user = User.objects.get(email=email)
        self.client.force_authenticate(user=user)

    def test_guest_can_list_and_view_public_events(self):
        list_response = self.client.get(reverse("event-list"))
        detail_response = self.client.get(reverse("event-detail", args=[self.event.id]))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["title"], self.event.title)
        self.assertEqual(detail_response.data["organization"]["id"], self.organization.id)
        self.assertEqual(detail_response.data["viewer_rsvp_status"], None)
        self.assertEqual(detail_response.data["relevance_signals"]["fields"], ["design"])
        self.assertEqual(detail_response.data["relevance_signals"]["skills"][0], "facilitation")
        self.assertEqual(detail_response.data["attended_count"], 0)

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
                "field_signals": ["technology", "technology"],
                "related_skills": ["public speaking", "product demos"],
                "related_course_ids": [44, "44", 52],
                "participation_signals": ["attendance", "community_engagement"],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        event_id = create_response.data["id"]
        self.assertEqual(create_response.data["field_signals"], ["technology"])
        self.assertEqual(create_response.data["related_course_ids"], [44, 52])
        self.assertEqual(
            create_response.data["relevance_signals"]["participation"]["signals"],
            ["attendance", "community_engagement"],
        )

        update_response = self.client.patch(
            reverse("event-manage-detail", args=[event_id]),
            {"location": "Hybrid campus", "is_online": False, "meeting_url": ""},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["location"], "Hybrid campus")
        self.assertFalse(update_response.data["is_online"])

    def test_organization_can_list_attendees_and_mark_attendance(self):
        going_rsvp = EventRSVP.objects.create(
            event=self.event,
            user=self.regular_user,
            status=RSVPStatus.GOING,
        )
        EventRSVP.objects.create(
            event=self.event,
            user=self.other_regular_user,
            status=RSVPStatus.INTERESTED,
        )
        self.authenticate("events-org@example.com", "StrongPass123!")

        attendee_list_response = self.client.get(
            reverse("event-manage-attendee-list", args=[self.event.id]),
        )
        filtered_response = self.client.get(
            reverse("event-manage-attendee-list", args=[self.event.id]),
            {"status": RSVPStatus.GOING, "attended": "false"},
        )
        mark_attended_response = self.client.patch(
            reverse("event-manage-attendee-detail", args=[self.event.id, going_rsvp.id]),
            {"attended": True},
            format="json",
        )
        event_detail_response = self.client.get(reverse("event-manage-detail", args=[self.event.id]))

        self.assertEqual(attendee_list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(attendee_list_response.data), 2)
        self.assertEqual(filtered_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filtered_response.data), 1)
        self.assertEqual(filtered_response.data[0]["attendee"]["id"], self.regular_user.id)
        self.assertEqual(mark_attended_response.status_code, status.HTTP_200_OK)
        self.assertTrue(mark_attended_response.data["attendance_recorded"])
        self.assertTrue(mark_attended_response.data["review_unlock_ready"])
        self.assertEqual(event_detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(event_detail_response.data["total_rsvp_count"], 2)
        self.assertEqual(event_detail_response.data["interested_count"], 1)
        self.assertEqual(event_detail_response.data["attended_count"], 1)

    def test_organization_cannot_delete_event_with_attendee_records(self):
        EventRSVP.objects.create(
            event=self.event,
            user=self.regular_user,
            status=RSVPStatus.GOING,
        )
        self.authenticate("events-org@example.com", "StrongPass123!")

        response = self.client.delete(reverse("event-manage-detail", args=[self.event.id]))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("attendee records", str(response.data["detail"]).lower())

    def test_other_organization_cannot_manage_foreign_event_attendees(self):
        attendee = EventRSVP.objects.create(
            event=self.event,
            user=self.regular_user,
            status=RSVPStatus.GOING,
        )
        self.authenticate("other-events-org@example.com", "StrongPass123!")

        list_response = self.client.get(
            reverse("event-manage-attendee-list", args=[self.event.id]),
        )
        update_response = self.client.patch(
            reverse("event-manage-attendee-detail", args=[self.event.id, attendee.id]),
            {"attended": True},
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(update_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_list_events_and_apply_oversight_decision(self):
        EventRSVP.objects.create(
            event=self.event,
            user=self.regular_user,
            status=RSVPStatus.GOING,
        )
        self.authenticate("events-admin@example.com", "StrongPass123!")

        list_response = self.client.get(
            reverse("admin-event-list"),
            {"status": EventStatus.UPCOMING},
        )
        decision_response = self.client.post(
            reverse("admin-event-decision", args=[self.event.id]),
            {
                "status": EventStatus.CANCELLED,
                "rsvp_open": False,
                "review_notes": "Cancelled due to policy review.",
            },
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["organization"]["id"], self.organization.id)
        self.assertEqual(decision_response.status_code, status.HTTP_200_OK)
        self.assertEqual(decision_response.data["status"], EventStatus.CANCELLED)
        self.assertFalse(decision_response.data["rsvp_open"])
        self.assertEqual(decision_response.data["admin_review_notes"], "Cancelled due to policy review.")
        self.event.refresh_from_db()
        self.assertEqual(self.event.admin_reviewed_by, self.admin_user)
        self.assertTrue(
            AuditLog.objects.filter(
                action="event.admin.reviewed",
                target_type="event",
                target_id=self.event.id,
            ).exists()
        )

    def test_non_admin_cannot_access_admin_event_oversight(self):
        self.authenticate("events-user@example.com", "StrongPass123!")

        list_response = self.client.get(reverse("admin-event-list"))
        decision_response = self.client.post(
            reverse("admin-event-decision", args=[self.event.id]),
            {"status": EventStatus.CANCELLED},
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(decision_response.status_code, status.HTTP_403_FORBIDDEN)

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
        self.assertEqual(
            list_response.data[0]["relevance_signals"]["participation"]["signals"],
            ["community", "workshop_attendance"],
        )

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
