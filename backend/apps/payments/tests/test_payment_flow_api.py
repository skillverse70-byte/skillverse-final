import hashlib
import hmac
import json
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.enums import (
    CourseProgramStatus,
    FinancialAccountStatus,
    OrganizationType,
    OrganizationVerificationStatus,
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
