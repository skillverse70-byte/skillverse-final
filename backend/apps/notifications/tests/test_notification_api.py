from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.services import issue_verification_token
from apps.common.enums import (
    CourseProgramStatus,
    EventStatus,
    FinancialAccountStatus,
    JobApplicationStatus,
    LearningSessionStatus,
    NotificationType,
    OpportunityStatus,
    OrganizationType,
    OrganizationVerificationReviewStatus,
    OrganizationVerificationStatus,
    PaymentTransactionStatus,
    Role,
    RSVPStatus,
    SkillSwapStatus,
)
from apps.courses.models import CourseProgram, Enrollment
from apps.courses.services import activate_paid_enrollment
from apps.events.models import Event, EventRSVP
from apps.messaging.services import ensure_message_thread_for_swap_request, create_thread_message
from apps.notifications.models import Notification
from apps.opportunities.models import Opportunity
from apps.organizations.models import Organization, OrganizationVerificationRequest
from apps.organizations.services import review_organization_verification_request
from apps.payments.models import FinancialAccount, PaymentTransaction
from apps.sessions.services import create_learning_session, update_learning_session
from apps.swaps.services import create_swap_request, transition_swap_request

User = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class NotificationApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        mail.outbox = []
        verified_at = timezone.now()

        self.regular_user = User.objects.create_user(
            email="learner@example.com",
            password="StrongPass123!",
            full_name="Learner One",
            role=Role.REGULAR_USER,
            email_verified_at=verified_at,
        )
        self.partner_user = User.objects.create_user(
            email="partner@example.com",
            password="StrongPass123!",
            full_name="Partner Two",
            role=Role.REGULAR_USER,
            email_verified_at=verified_at,
        )
        self.organization_user = User.objects.create_user(
            email="org@example.com",
            password="StrongPass123!",
            full_name="Org Owner",
            role=Role.ORGANIZATION,
            email_verified_at=verified_at,
        )
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="StrongPass123!",
            full_name="Admin User",
            role=Role.ADMIN,
            is_staff=True,
            is_superuser=True,
            email_verified_at=verified_at,
        )

        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="SkillVerse Org",
            type=OrganizationType.COMPANY,
            description="Organization profile",
            contact_email="org@example.com",
            country="Ethiopia",
            location="Addis Ababa",
            verification_status=OrganizationVerificationStatus.VERIFIED,
        )
        self.course = CourseProgram.objects.create(
            organization=self.organization,
            title="Backend Foundations",
            description="Course description",
            category="Engineering",
            is_free=False,
            price_amount=Decimal("120.00"),
            price_currency="ETB",
            status=CourseProgramStatus.PUBLISHED,
            enrollment_open=True,
        )
        self.opportunity = Opportunity.objects.create(
            organization=self.organization,
            title="Frontend Internship",
            description="A structured internship",
            status=OpportunityStatus.OPEN,
            location="Remote",
        )
        self.event = Event.objects.create(
            organization=self.organization,
            title="Product Demo Day",
            description="Community event",
            status=EventStatus.UPCOMING,
            starts_at=timezone.now() + timedelta(days=2),
            location="Online",
            is_online=True,
            meeting_url="https://example.com/event",
        )

    def assert_notification_for_user(self, user, notification_type, *, title=None, metadata=None):
        queryset = Notification.objects.filter(user=user, type=notification_type).order_by("-id")
        if title is not None:
            queryset = queryset.filter(title=title)
        notification = queryset.first()
        self.assertIsNotNone(notification)
        for key, value in (metadata or {}).items():
            self.assertEqual(notification.metadata.get(key), value)
        return notification

    def test_user_can_list_and_mark_notifications_read(self):
        first = Notification.objects.create(
            user=self.regular_user,
            type=NotificationType.MESSAGE,
            title="Message arrived",
            message="A message is waiting for you.",
            action_url="/messages",
        )
        second = Notification.objects.create(
            user=self.regular_user,
            type=NotificationType.SWAP,
            title="Swap update",
            message="A swap needs your attention.",
            action_url="/skill-swap",
        )

        self.client.force_authenticate(user=self.regular_user)

        list_response = self.client.get(reverse("notification-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 2)

        summary_response = self.client.get(reverse("notification-summary"))
        self.assertEqual(summary_response.status_code, status.HTTP_200_OK)
        self.assertEqual(summary_response.data["unread_count"], 2)

        mark_response = self.client.post(reverse("notification-mark-read", args=[first.id]), format="json")
        self.assertEqual(mark_response.status_code, status.HTTP_200_OK)
        first.refresh_from_db()
        self.assertTrue(first.is_read)

        read_all_response = self.client.post(reverse("notification-mark-all-read"), format="json")
        self.assertEqual(read_all_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_all_response.data["updated_count"], 1)
        self.assertEqual(read_all_response.data["unread_count"], 0)

        second.refresh_from_db()
        self.assertTrue(second.is_read)

    def test_verification_swap_message_and_session_flows_create_notifications(self):
        with self.captureOnCommitCallbacks(execute=True):
            issue_verification_token(self.regular_user)
        self.assertTrue(
            Notification.objects.filter(
                user=self.regular_user,
                type=NotificationType.VERIFICATION,
            ).exists()
        )
        self.assertEqual(mail.outbox[-1].to, [self.regular_user.email])

        with self.captureOnCommitCallbacks(execute=True):
            swap_request = create_swap_request(
                requester=self.regular_user,
                recipient=self.partner_user,
                message="Want to exchange Django for React?",
            )
        self.assert_notification_for_user(
            self.partner_user,
            NotificationType.SWAP,
            title="New skill swap request",
            metadata={"swap_request_id": swap_request.id},
        )

        with self.captureOnCommitCallbacks(execute=True):
            transition_swap_request(
                swap_request=swap_request,
                changed_by=self.partner_user,
                to_status=SkillSwapStatus.ACCEPTED,
                note="Let's do it.",
            )
        self.assert_notification_for_user(
            self.regular_user,
            NotificationType.SWAP,
            title="Skill swap request accepted",
            metadata={
                "swap_request_id": swap_request.id,
                "status": SkillSwapStatus.ACCEPTED,
            },
        )

        thread = ensure_message_thread_for_swap_request(
            swap_request=swap_request,
            created_by=self.partner_user,
        )
        with self.captureOnCommitCallbacks(execute=True):
            create_thread_message(
                thread=thread,
                sender=self.partner_user,
                content="Great, I can start tomorrow.",
            )
        self.assert_notification_for_user(
            self.regular_user,
            NotificationType.MESSAGE,
            metadata={"thread_id": thread.id},
        )

        with self.captureOnCommitCallbacks(execute=True):
            session = create_learning_session(
                swap_request=swap_request,
                created_by=self.partner_user,
                title="Kickoff learning session",
                description="First pairing session",
                scheduled_start_at=timezone.now() + timedelta(days=1),
            )
        self.assert_notification_for_user(
            self.regular_user,
            NotificationType.SESSION,
            title="Learning session planned",
            metadata={"session_id": session.id},
        )

        with self.captureOnCommitCallbacks(execute=True):
            update_learning_session(
                session,
                self.partner_user,
                status=LearningSessionStatus.CONFIRMED,
            )
        self.assert_notification_for_user(
            self.regular_user,
            NotificationType.SESSION,
            title="Learning session confirmed",
            metadata={"session_id": session.id},
        )

    def test_enrollment_and_opportunity_flows_create_notifications(self):
        payment_transaction = PaymentTransaction.objects.create(
            user=self.regular_user,
            course_program=self.course,
            organization=self.organization,
            tx_ref="TX-903-001",
            amount=self.course.price_amount,
            currency="ETB",
            status=PaymentTransactionStatus.SUCCEEDED,
            callback_url="http://localhost:8000/api/payments/chapa/callback/",
            return_url="http://localhost:5173/courses/1",
        )

        with self.captureOnCommitCallbacks(execute=True):
            enrollment = activate_paid_enrollment(payment_transaction)
        self.assertIsInstance(enrollment, Enrollment)
        self.assert_notification_for_user(
            self.regular_user,
            NotificationType.ENROLLMENT,
            title=f"You're enrolled in {self.course.title}",
            metadata={"course_program_id": self.course.id},
        )
        self.assert_notification_for_user(
            self.organization_user,
            NotificationType.COURSE,
            title="New course enrollment",
            metadata={
                "course_program_id": self.course.id,
                "learner_id": self.regular_user.id,
            },
        )

        self.client.force_authenticate(user=self.regular_user)
        with self.captureOnCommitCallbacks(execute=True):
            apply_response = self.client.post(
                reverse("job-apply", args=[self.opportunity.id]),
                {"cover_letter": "I would love to join."},
                format="json",
            )
        self.assertEqual(apply_response.status_code, status.HTTP_201_CREATED)
        application_id = apply_response.data["id"]
        self.assert_notification_for_user(
            self.organization_user,
            NotificationType.OPPORTUNITY,
            title=f"New application for {self.opportunity.title}",
            metadata={"application_id": application_id},
        )

        self.client.force_authenticate(user=self.organization_user)
        with self.captureOnCommitCallbacks(execute=True):
            review_response = self.client.patch(
                reverse("job-manage-application-detail", args=[application_id]),
                {
                    "status": JobApplicationStatus.SHORTLISTED,
                    "reviewer_notes": "Strong profile.",
                },
                format="json",
            )
        self.assertEqual(review_response.status_code, status.HTTP_200_OK)
        self.assert_notification_for_user(
            self.regular_user,
            NotificationType.OPPORTUNITY,
            title=f"Application update for {self.opportunity.title}",
            metadata={
                "application_id": application_id,
                "status": JobApplicationStatus.SHORTLISTED,
            },
        )
        self.assertEqual(mail.outbox[-1].to, [self.regular_user.email])

    def test_event_and_governance_flows_create_notifications(self):
        self.client.force_authenticate(user=self.regular_user)
        with self.captureOnCommitCallbacks(execute=True):
            rsvp_response = self.client.post(
                reverse("event-rsvp", args=[self.event.id]),
                {"status": RSVPStatus.GOING},
                format="json",
            )
        self.assertEqual(rsvp_response.status_code, status.HTTP_200_OK)
        rsvp = EventRSVP.objects.get(id=rsvp_response.data["id"])
        self.assert_notification_for_user(
            self.organization_user,
            NotificationType.EVENT,
            title=f"New RSVP for {self.event.title}",
            metadata={"rsvp_id": rsvp.id},
        )

        self.client.force_authenticate(user=self.organization_user)
        with self.captureOnCommitCallbacks(execute=True):
            attendee_response = self.client.patch(
                reverse("event-manage-attendee-detail", args=[self.event.id, rsvp.id]),
                {"status": RSVPStatus.GOING, "attended": True},
                format="json",
            )
        self.assertEqual(attendee_response.status_code, status.HTTP_200_OK)
        self.assert_notification_for_user(
            self.regular_user,
            NotificationType.EVENT,
            title=f"Your event status changed for {self.event.title}",
            metadata={
                "rsvp_id": rsvp.id,
                "attended": True,
            },
        )

        verification_request = OrganizationVerificationRequest.objects.create(
            organization=self.organization,
            requested_by=self.organization_user,
            request_notes="Please verify us.",
        )
        with self.captureOnCommitCallbacks(execute=True):
            review_organization_verification_request(
                verification_request=verification_request,
                reviewer=self.admin_user,
                decision=OrganizationVerificationReviewStatus.APPROVED,
                reviewer_notes="Approved after review.",
            )
        self.assert_notification_for_user(
            self.organization_user,
            NotificationType.ADMIN,
            title="Organization verification approved",
            metadata={"verification_request_id": verification_request.id},
        )

        financial_account = FinancialAccount.objects.create(
            organization=self.organization,
            provider="chapa",
            status=FinancialAccountStatus.PENDING,
            business_name="SkillVerse Org",
        )
        self.client.force_authenticate(user=self.admin_user)
        with self.captureOnCommitCallbacks(execute=True):
            financial_response = self.client.post(
                reverse("admin-financial-account-decision", args=[financial_account.id]),
                {
                    "decision": FinancialAccountStatus.READY,
                    "review_notes": "Approved for payouts.",
                },
                format="json",
            )
        self.assertEqual(financial_response.status_code, status.HTTP_200_OK)
        self.assert_notification_for_user(
            self.organization_user,
            NotificationType.ADMIN,
            title="Financial account approved",
            metadata={"financial_account_id": financial_account.id},
        )

        with self.captureOnCommitCallbacks(execute=True):
            event_review_response = self.client.post(
                reverse("admin-event-decision", args=[self.event.id]),
                {
                    "status": EventStatus.LIVE,
                    "review_notes": "Approved for publishing.",
                    "rsvp_open": True,
                },
                format="json",
            )
        self.assertEqual(event_review_response.status_code, status.HTTP_200_OK)
        self.assert_notification_for_user(
            self.organization_user,
            NotificationType.ADMIN,
            title=f"Admin updated {self.event.title}",
            metadata={"event_id": self.event.id},
        )
