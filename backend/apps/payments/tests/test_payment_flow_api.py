import hashlib
import hmac
import json
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
from apps.certificates.models import ServiceCreditRecord
from apps.common.enums import (
    CourseOfferingType,
    CourseProgramStatus,
    FinancialAccountStatus,
    OrganizationType,
    OrganizationVerificationStatus,
    PaymentAutomationStatus,
    PaymentTransactionPurpose,
    PaymentTransactionStatus,
    Role,
)
from apps.courses.models import CourseProgram, Enrollment
from apps.organizations.models import Organization
from apps.payments.models import (
    FinancialAccount,
    PaymentTransaction,
    PaymentWebhookEvent,
)
from apps.payments.services.payment import ChapaPaymentService

User = get_user_model()


@override_settings(
    CHAPA_SECRET_KEY="CHASECK_TEST_example",
    CHAPA_WEBHOOK_SECRET="webhook-test-secret",
    CHAPA_ENV="test",
)
class PaymentFlowApiTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.organization_user = User.objects.create_user(
            email="paid-course-org@example.com",
            password="StrongPass123!",
            full_name="Paid Course Org",
            role=Role.ORGANIZATION,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.organization = Organization.objects.create(
            owner=self.organization_user,
            name="Paid Course Org",
            type=OrganizationType.COMPANY,
            description="Offers paid courses.",
            contact_email="paid-course-org@example.com",
            verification_status=OrganizationVerificationStatus.VERIFIED,
        )
        FinancialAccount.objects.create(
            organization=self.organization,
            status=FinancialAccountStatus.READY,
            business_name="Paid Course Org",
        )
        self.learner = User.objects.create_user(
            email="paid-course-learner@example.com",
            password="StrongPass123!",
            full_name="Test Learner",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.course = CourseProgram.objects.create(
            organization=self.organization,
            title="Paid Analytics Course",
            status=CourseProgramStatus.PUBLISHED,
            is_free=False,
            price_amount=Decimal("1250.00"),
            price_currency="ETB",
            enrollment_open=True,
        )

    def authenticate(self, user):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": "StrongPass123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}"
        )

    def create_payment(self, **overrides):
        values = {
            "user": self.learner,
            "course_program": self.course,
            "organization": self.organization,
            "tx_ref": "SV-test-payment",
            "amount": self.course.price_amount,
            "currency": self.course.price_currency,
            "purpose": PaymentTransactionPurpose.COURSE_ENROLLMENT,
            "status": PaymentTransactionStatus.PENDING,
            "checkout_url": "https://checkout.chapa.co/test",
        }
        values.update(overrides)
        return PaymentTransaction.objects.create(**values)

    @staticmethod
    def successful_verification(payment):
        return {
            "status": "success",
            "message": "Payment details",
            "data": {
                "tx_ref": payment.tx_ref,
                "amount": str(payment.amount),
                "currency": payment.currency,
                "status": "success",
                "mode": "test",
                "method": "telebirr",
                "reference": "APQ1kcaiCZi2",
                "charge": "25.00",
            },
        }

    @patch("apps.payments.services.payment.ChapaPaymentService._request_json")
    def test_chapa_checkout_title_respects_provider_limit(self, mock_request_json):
        mock_request_json.return_value = {
            "status": "success",
            "data": {
                "checkout_url": "https://checkout.chapa.co/hosted/test",
            },
        }
        service = ChapaPaymentService()

        service.initiate_payment(
            amount=Decimal("1250.00"),
            currency="ETB",
            tx_ref="SV-title-limit",
            user=self.learner,
            callback_url="https://example.com/api/payments/callback",
            return_url="https://example.com/courses/1/payment-return",
            metadata={
                "title": "Paid Analytics Course Enrollment Checkout",
                "description": "Enrollment in Paid Analytics Course",
                "course_program_id": self.course.pk,
                "payment_reason": "Course enrollment: Paid Analytics Course",
            },
        )

        payload = mock_request_json.call_args.kwargs["payload"]
        self.assertLessEqual(
            len(payload["customization"]["title"]),
            ChapaPaymentService.CUSTOMIZATION_TITLE_MAX_LENGTH,
        )
        self.assertEqual(payload["customization"]["title"], "Paid Analytics C")

    @patch("apps.payments.views.ChapaPaymentService.initiate_payment")
    def test_learner_can_initialize_checkout_with_server_owned_price(
        self,
        mock_initiate_payment,
    ):
        mock_initiate_payment.return_value = {
            "status": PaymentTransactionStatus.PENDING,
            "tx_ref": "provider-uses-local-ref",
            "checkout_url": "https://checkout.chapa.co/hosted/test",
        }
        self.authenticate(self.learner)

        response = self.client.post(
            reverse("course-checkout-list-create"),
            {
                "course_program_id": self.course.id,
                "phone_number": "0900123456",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = PaymentTransaction.objects.get()
        self.assertEqual(payment.status, PaymentTransactionStatus.PENDING)
        self.assertEqual(payment.amount, Decimal("1250.00"))
        self.assertEqual(payment.currency, "ETB")
        self.assertEqual(
            payment.checkout_url,
            "https://checkout.chapa.co/hosted/test",
        )
        call_kwargs = mock_initiate_payment.call_args.kwargs
        self.assertEqual(call_kwargs["amount"], Decimal("1250.00"))
        self.assertEqual(call_kwargs["currency"], "ETB")
        self.assertEqual(call_kwargs["tx_ref"], payment.tx_ref)
        self.assertTrue(
            AuditLog.objects.filter(
                action="payment.checkout.created",
                target_id=payment.id,
            ).exists()
        )

    @patch("apps.payments.views.ChapaPaymentService.initiate_payment")
    def test_organization_cannot_start_learner_checkout(self, mock_initiate_payment):
        self.authenticate(self.organization_user)

        response = self.client.post(
            reverse("course-checkout-list-create"),
            {"course_program_id": self.course.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        mock_initiate_payment.assert_not_called()

    def test_paid_course_enrollment_is_blocked_without_verified_payment(self):
        self.authenticate(self.learner)

        response = self.client.post(reverse("course-enroll", args=[self.course.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Verified payment is required.")
        self.assertFalse(Enrollment.objects.exists())

    @patch("apps.payments.views.ChapaPaymentService.verify_payment")
    def test_verified_payment_becomes_enrollment_ready(self, mock_verify_payment):
        payment = self.create_payment()
        mock_verify_payment.return_value = self.successful_verification(payment)
        self.authenticate(self.learner)

        verify_response = self.client.post(
            reverse("course-checkout-verify", args=[payment.tx_ref])
        )
        enroll_response = self.client.post(
            reverse("course-enroll", args=[self.course.id])
        )

        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            verify_response.data["status"],
            PaymentTransactionStatus.SUCCEEDED,
        )
        self.assertTrue(verify_response.data["enrollment_ready"])
        self.assertEqual(
            verify_response.data["receipt_url"],
            "https://chapa.link/payment-receipt/APQ1kcaiCZi2",
        )
        payment.refresh_from_db()
        self.assertTrue(
            Enrollment.objects.filter(
                user=self.learner,
                course_program=self.course,
            ).exists()
        )
        self.assertEqual(enroll_response.status_code, status.HTTP_200_OK)
        self.assertEqual(enroll_response.data["status"], "active")

    @patch("apps.payments.views.ChapaPaymentService.verify_payment")
    def test_verification_rejects_amount_mismatch(self, mock_verify_payment):
        payment = self.create_payment()
        verification = self.successful_verification(payment)
        verification["data"]["amount"] = "1.00"
        mock_verify_payment.return_value = verification
        self.authenticate(self.learner)

        response = self.client.post(
            reverse("course-checkout-verify", args=[payment.tx_ref])
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransactionStatus.PENDING)
        self.assertEqual(payment.failure_reason, "verification_mismatch")
        self.assertTrue(
            AuditLog.objects.filter(
                action="payment.transaction.verification_failed",
                target_id=payment.id,
            ).exists()
        )

    @patch("apps.payments.views.ChapaPaymentService.verify_payment")
    def test_invalid_webhook_signature_is_silently_ignored(self, mock_verify_payment):
        payment = self.create_payment()
        payload = {
            "event": "charge.success",
            "tx_ref": payment.tx_ref,
            "reference": "APQ1kcaiCZi2",
            "status": "success",
        }

        response = self.client.post(
            reverse("chapa-webhook"),
            data=json.dumps(payload, separators=(",", ":")),
            content_type="application/json",
            HTTP_X_CHAPA_SIGNATURE="invalid",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_verify_payment.assert_not_called()
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransactionStatus.PENDING)

    @patch("apps.payments.services.payment.ChapaPaymentService.verify_payment")
    def test_signed_webhook_verifies_once_and_is_idempotent(self, mock_verify_payment):
        payment = self.create_payment()
        mock_verify_payment.return_value = self.successful_verification(payment)
        payload = {
            "event": "charge.success",
            "tx_ref": payment.tx_ref,
            "reference": "APQ1kcaiCZi2",
            "status": "success",
        }
        body = json.dumps(payload, separators=(",", ":"))
        signature = hmac.new(
            b"webhook-test-secret",
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        first_response = self.client.post(
            reverse("chapa-webhook"),
            data=body,
            content_type="application/json",
            HTTP_X_CHAPA_SIGNATURE=signature,
        )
        second_response = self.client.post(
            reverse("chapa-webhook"),
            data=body,
            content_type="application/json",
            HTTP_X_CHAPA_SIGNATURE=signature,
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentTransactionStatus.SUCCEEDED)
        self.assertEqual(mock_verify_payment.call_count, 1)
        self.assertEqual(PaymentWebhookEvent.objects.count(), 1)
        self.assertTrue(PaymentWebhookEvent.objects.get().processed)
        self.assertTrue(
            AuditLog.objects.filter(
                action="payment.webhook.processed",
                metadata__tx_ref=payment.tx_ref,
            ).exists()
        )
        self.assertTrue(
            Enrollment.objects.filter(
                user=self.learner,
                course_program=self.course,
            ).exists()
        )

    def test_actor_scoped_history_hides_other_learners_payments(self):
        payment = self.create_payment()
        other_learner = User.objects.create_user(
            email="other-paid-learner@example.com",
            password="StrongPass123!",
            full_name="Other Learner",
            role=Role.REGULAR_USER,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.authenticate(other_learner)

        list_response = self.client.get(reverse("course-checkout-list-create"))
        detail_response = self.client.get(
            reverse("course-checkout-detail", args=[payment.tx_ref])
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data, [])
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("apps.payments.views.ChapaPaymentService.initiate_payment")
    @patch("apps.payments.views.ChapaPaymentService.verify_payment")
    def test_paid_community_service_course_completes_service_credit_automation(
        self,
        mock_verify_payment,
        mock_initiate_payment,
    ):
        self.course.offering_type = CourseOfferingType.COMMUNITY_SERVICE
        self.course.auto_issue_service_credit = True
        self.course.service_credit_hours = Decimal("8.50")
        self.course.service_credit_title = "Neighborhood Service Credit"
        self.course.service_credit_description = "Issued for completing the neighborhood support program."
        self.course.save(
            update_fields=[
                "offering_type",
                "auto_issue_service_credit",
                "service_credit_hours",
                "service_credit_title",
                "service_credit_description",
                "updated_at",
            ]
        )
        module = self.course.modules.create(title="Service module", sort_order=0)
        lesson = module.lesson_items.create(
            title="Volunteer reflection",
            item_type="reading",
            content_url="https://example.com/community-service",
            sort_order=0,
        )
        mock_initiate_payment.return_value = {
            "status": PaymentTransactionStatus.PENDING,
            "tx_ref": "provider-uses-local-ref",
            "checkout_url": "https://checkout.chapa.co/hosted/community-service",
        }
        self.authenticate(self.learner)

        checkout_response = self.client.post(
            reverse("course-checkout-list-create"),
            {"course_program_id": self.course.id},
            format="json",
        )
        payment = PaymentTransaction.objects.get()
        mock_verify_payment.return_value = self.successful_verification(payment)

        verify_response = self.client.post(
            reverse("course-checkout-verify", args=[payment.tx_ref])
        )
        with self.captureOnCommitCallbacks(execute=True):
            complete_response = self.client.post(
                reverse("course-lesson-complete", args=[self.course.id, lesson.id])
            )

        self.assertEqual(checkout_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(payment.purpose, PaymentTransactionPurpose.COMMUNITY_SERVICE_ENROLLMENT)
        self.assertEqual(
            verify_response.data["automation_status"],
            PaymentAutomationStatus.PENDING,
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.automation_status, PaymentAutomationStatus.COMPLETED)
        self.assertIsNotNone(payment.fulfilled_at)
        self.assertIsNotNone(payment.service_credit_record_id)
        service_credit = ServiceCreditRecord.objects.get(id=payment.service_credit_record_id)
        self.assertEqual(service_credit.course_program, self.course)
        self.assertEqual(service_credit.user, self.learner)
        self.assertEqual(service_credit.credit_hours, Decimal("8.50"))
        self.assertTrue(
            AuditLog.objects.filter(
                action="payment.automation.completed",
                target_id=payment.id,
            ).exists()
        )

    def test_organization_can_filter_payment_history_by_purpose_and_automation_status(self):
        self.course.offering_type = CourseOfferingType.COMMUNITY_SERVICE
        self.course.save(update_fields=["offering_type", "updated_at"])
        completed_payment = self.create_payment(
            tx_ref="SV-community-complete",
            status=PaymentTransactionStatus.SUCCEEDED,
            purpose=PaymentTransactionPurpose.COMMUNITY_SERVICE_ENROLLMENT,
            automation_status=PaymentAutomationStatus.COMPLETED,
        )
        self.create_payment(
            tx_ref="SV-standard-pending",
            status=PaymentTransactionStatus.PENDING,
            purpose=PaymentTransactionPurpose.COURSE_ENROLLMENT,
            automation_status=PaymentAutomationStatus.NONE,
        )
        ServiceCreditRecord.objects.create(
            organization=self.organization,
            user=self.learner,
            course_program=self.course,
            title="Community credit",
            credit_hours=Decimal("4.00"),
            issued_by=self.organization_user,
        )
        self.authenticate(self.organization_user)

        response = self.client.get(
            reverse("course-checkout-list-create"),
            {
                "purpose": PaymentTransactionPurpose.COMMUNITY_SERVICE_ENROLLMENT,
                "automation_status": PaymentAutomationStatus.COMPLETED,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["tx_ref"], completed_payment.tx_ref)
        self.assertEqual(
            response.data[0]["purpose"],
            PaymentTransactionPurpose.COMMUNITY_SERVICE_ENROLLMENT,
        )

    def test_organization_can_retry_failed_community_service_automation(self):
        self.course.offering_type = CourseOfferingType.COMMUNITY_SERVICE
        self.course.auto_issue_service_credit = True
        self.course.service_credit_hours = Decimal("6.00")
        self.course.save(
            update_fields=[
                "offering_type",
                "auto_issue_service_credit",
                "service_credit_hours",
                "updated_at",
            ]
        )
        Enrollment.objects.create(
            user=self.learner,
            course_program=self.course,
            status="completed",
            progress_percent=100,
            completed_at=timezone.now(),
        )
        payment = self.create_payment(
            tx_ref="SV-community-retry",
            status=PaymentTransactionStatus.SUCCEEDED,
            purpose=PaymentTransactionPurpose.COMMUNITY_SERVICE_ENROLLMENT,
            automation_status=PaymentAutomationStatus.FAILED,
            automation_error="Previous automation failed.",
        )
        self.authenticate(self.organization_user)

        response = self.client.post(
            reverse("course-checkout-retry-automation", args=[payment.tx_ref])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.automation_status, PaymentAutomationStatus.COMPLETED)
        self.assertEqual(payment.automation_error, "")
        self.assertIsNotNone(payment.service_credit_record_id)

    def test_admin_can_view_payment_history_with_org_filter(self):
        payment = self.create_payment(
            tx_ref="SV-admin-history",
            status=PaymentTransactionStatus.SUCCEEDED,
            purpose=PaymentTransactionPurpose.COURSE_ENROLLMENT,
        )
        admin_user = User.objects.create_user(
            email="payments-root-admin@example.com",
            password="StrongPass123!",
            full_name="Root Admin",
            role=Role.ADMIN,
            is_staff=True,
            email_verified_at="2026-07-06T00:00:00Z",
        )
        self.authenticate(admin_user)

        response = self.client.get(
            reverse("course-checkout-list-create"),
            {"organization_id": self.organization.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["tx_ref"], payment.tx_ref)
