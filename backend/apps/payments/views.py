import uuid

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.common.enums import (
    CourseProgramStatus,
    FinancialAccountStatus,
    PaymentTransactionStatus,
    Role,
)
from apps.common.permissions import (
    IsAdminActor,
    IsOrganizationActorOrAdmin,
    normalize_actor_role,
)
from apps.common.trust import get_paid_course_enrollment_gate
from apps.courses.models import CourseProgram, Enrollment
from apps.organizations.models import Organization
from apps.payments.models import FinancialAccount, PaymentTransaction
from apps.payments.permissions import IsPaymentActor
from apps.payments.serializers import (
    AdminFinancialAccountSerializer,
    ChapaCallbackRequestSerializer,
    ChapaCallbackResponseSerializer,
    ChapaWebhookResponseSerializer,
    FinancialAccountSerializer,
    FinancialAccountReviewDecisionSerializer,
    PaymentCheckoutCreateSerializer,
    PaymentTransactionSerializer,
)
from apps.payments.services.payment import (
    ChapaPaymentError,
    ChapaPaymentService,
    ChapaVerificationError,
)


@extend_schema(tags=["payments"], responses={200: FinancialAccountSerializer})
class CurrentFinancialAccountView(RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActorOrAdmin]
    serializer_class = FinancialAccountSerializer

    def get_object(self):
        organization = Organization.objects.select_related("owner").get(owner=self.request.user)
        financial_account, _ = FinancialAccount.objects.get_or_create(
            organization=organization,
            defaults={"provider": "chapa"},
        )
        return financial_account

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        financial_account = self.get_object()
        serializer = self.get_serializer(
            financial_account,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response_serializer = self.get_serializer(financial_account)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["payments", "admin"],
        operation_id="payments_admin_financial_account_list",
        responses={200: AdminFinancialAccountSerializer(many=True)},
    )
)
class AdminFinancialAccountListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AdminFinancialAccountSerializer

    def get_queryset(self):
        queryset = FinancialAccount.objects.select_related(
            "organization",
            "organization__owner",
            "reviewed_by",
        )
        status_filter = self.request.query_params.get("status", "").strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


@extend_schema_view(
    post=extend_schema(
        tags=["payments", "admin"],
        operation_id="payments_admin_financial_account_decide",
        request=FinancialAccountReviewDecisionSerializer,
        responses={200: AdminFinancialAccountSerializer},
    )
)
class AdminFinancialAccountDecisionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = FinancialAccountReviewDecisionSerializer

    def post(self, request, pk):
        financial_account = get_object_or_404(
            FinancialAccount.objects.select_related(
                "organization",
                "organization__owner",
                "reviewed_by",
            ),
            pk=pk,
        )
        serializer = self.get_serializer(
            data=request.data,
            context={"financial_account": financial_account},
        )
        serializer.is_valid(raise_exception=True)

        decision = serializer.validated_data["decision"]
        financial_account.status = decision
        financial_account.review_notes = serializer.validated_data.get(
            "review_notes",
            "",
        )
        financial_account.restricted_reason = (
            serializer.validated_data.get("restricted_reason", "")
            if decision == FinancialAccountStatus.RESTRICTED
            else ""
        )
        financial_account.reviewed_by = request.user
        financial_account.reviewed_at = timezone.now()
        financial_account.verified_at = (
            timezone.now()
            if decision == FinancialAccountStatus.READY
            else None
        )
        financial_account.save()
        from apps.notifications.services import notify_financial_account_reviewed

        notify_financial_account_reviewed(financial_account)
        return Response(
            AdminFinancialAccountSerializer(financial_account).data,
            status=status.HTTP_200_OK,
        )


def payment_transaction_queryset():
    return PaymentTransaction.objects.select_related(
        "user",
        "course_program",
        "organization",
        "organization__owner",
    )


def payment_transaction_for_actor(user, tx_ref):
    queryset = payment_transaction_queryset()
    role = normalize_actor_role(user)
    if role == Role.REGULAR_USER:
        queryset = queryset.filter(user=user)
    elif role == Role.ORGANIZATION:
        queryset = queryset.filter(organization__owner=user)
    else:
        raise PermissionDenied("This payment record is not available to your account.")
    return get_object_or_404(queryset, tx_ref=tx_ref)


@extend_schema_view(
    get=extend_schema(
        tags=["payments"],
        operation_id="payments_course_checkout_list",
        responses={200: PaymentTransactionSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["payments"],
        operation_id="payments_course_checkout_create",
        request=PaymentCheckoutCreateSerializer,
        responses={201: PaymentTransactionSerializer},
    ),
)
class CourseCheckoutListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsPaymentActor]
    serializer_class = PaymentCheckoutCreateSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payment"

    def get(self, request):
        queryset = payment_transaction_queryset()
        role = normalize_actor_role(request.user)
        if role == Role.REGULAR_USER:
            queryset = queryset.filter(user=request.user)
        else:
            queryset = queryset.filter(organization__owner=request.user)
        return Response(
            PaymentTransactionSerializer(queryset, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        if normalize_actor_role(request.user) != Role.REGULAR_USER:
            raise PermissionDenied("Only regular users can start course payments.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course_program = (
            CourseProgram.objects.select_related(
                "organization",
                "organization__financial_account",
            )
            .filter(
                pk=serializer.validated_data["course_program_id"],
                status=CourseProgramStatus.PUBLISHED,
            )
            .first()
        )
        if course_program is None:
            return Response(
                {"detail": "Course not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if course_program.is_free:
            return Response(
                {"detail": "Free courses do not require payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not course_program.enrollment_open:
            raise PermissionDenied("Enrollment Unavailable")

        financial_account = getattr(course_program.organization, "financial_account", None)
        gate = get_paid_course_enrollment_gate(
            course_program.organization,
            financial_account,
        )
        if not gate["can_enroll"]:
            raise PermissionDenied(gate["label"])

        if Enrollment.objects.filter(
            user=request.user,
            course_program=course_program,
        ).exclude(status="cancelled").exists():
            return Response(
                {"detail": "You are already enrolled in this course."},
                status=status.HTTP_409_CONFLICT,
            )
        if PaymentTransaction.objects.filter(
            user=request.user,
            course_program=course_program,
            status=PaymentTransactionStatus.SUCCEEDED,
        ).exists():
            return Response(
                {"detail": "This course payment has already been verified."},
                status=status.HTTP_409_CONFLICT,
            )

        tx_ref = f"SV-{course_program.pk}-{uuid.uuid4().hex}"
        callback_url = settings.CHAPA_CALLBACK_URL
        return_url = settings.CHAPA_RETURN_URL.format(
            course_id=course_program.pk,
            tx_ref=tx_ref,
        )
        payment_transaction = PaymentTransaction.objects.create(
            user=request.user,
            course_program=course_program,
            organization=course_program.organization,
            tx_ref=tx_ref,
            amount=course_program.price_amount,
            currency=course_program.price_currency.upper(),
            callback_url=callback_url,
            return_url=return_url,
        )

        service = ChapaPaymentService()
        try:
            initiation = service.initiate_payment(
                amount=payment_transaction.amount,
                currency=payment_transaction.currency,
                tx_ref=payment_transaction.tx_ref,
                user=request.user,
                callback_url=payment_transaction.callback_url,
                return_url=payment_transaction.return_url,
                phone_number=serializer.validated_data.get("phone_number", ""),
                metadata={
                    "title": course_program.title,
                    "description": f"Enrollment in {course_program.title}",
                    "course_program_id": course_program.pk,
                    "payment_reason": f"Course enrollment: {course_program.title}",
                },
            )
        except ChapaPaymentError as exc:
            payment_transaction.status = PaymentTransactionStatus.FAILED
            payment_transaction.failure_reason = str(exc)[:255]
            payment_transaction.save(
                update_fields=["status", "failure_reason", "updated_at"]
            )
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment_transaction.checkout_url = initiation["checkout_url"]
        payment_transaction.save(update_fields=["checkout_url", "updated_at"])
        return Response(
            PaymentTransactionSerializer(payment_transaction).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        tags=["payments"],
        operation_id="payments_course_checkout_retrieve",
        responses={200: PaymentTransactionSerializer},
    )
)
class CourseCheckoutDetailView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsPaymentActor]
    serializer_class = PaymentTransactionSerializer

    def get(self, request, tx_ref):
        payment_transaction = payment_transaction_for_actor(request.user, tx_ref)
        return Response(
            self.get_serializer(payment_transaction).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        tags=["payments"],
        operation_id="payments_course_checkout_verify",
        request=None,
        responses={200: PaymentTransactionSerializer},
    )
)
class CourseCheckoutVerifyView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsPaymentActor]
    serializer_class = PaymentTransactionSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "payment"

    def post(self, request, tx_ref):
        payment_transaction = payment_transaction_for_actor(request.user, tx_ref)
        try:
            ChapaPaymentService().reconcile_transaction(payment_transaction)
        except ChapaVerificationError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        except ChapaPaymentError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        payment_transaction.refresh_from_db()
        return Response(
            self.get_serializer(payment_transaction).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    get=extend_schema(
        tags=["payments"],
        operation_id="payments_chapa_callback_get",
        parameters=[
            OpenApiParameter("tx_ref", str, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("trx_ref", str, OpenApiParameter.QUERY, required=False),
        ],
        responses={200: ChapaCallbackResponseSerializer},
    ),
    post=extend_schema(
        tags=["payments"],
        operation_id="payments_chapa_callback_post",
        request=ChapaCallbackRequestSerializer,
        responses={200: ChapaCallbackResponseSerializer},
    ),
)
class ChapaCallbackView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return self._verify_callback(request.query_params)

    def post(self, request):
        return self._verify_callback(request.data)

    @staticmethod
    def _verify_callback(values):
        tx_ref = values.get("tx_ref") or values.get("trx_ref")
        payment_transaction = PaymentTransaction.objects.filter(tx_ref=tx_ref).first()
        if payment_transaction is None:
            return Response({"received": True}, status=status.HTTP_200_OK)
        try:
            ChapaPaymentService().reconcile_transaction(payment_transaction)
        except ChapaPaymentError:
            pass
        payment_transaction.refresh_from_db()
        return Response(
            {
                "received": True,
                "tx_ref": payment_transaction.tx_ref,
                "payment_status": payment_transaction.status,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    post=extend_schema(
        tags=["payments"],
        operation_id="payments_chapa_webhook",
        request=OpenApiTypes.OBJECT,
        responses={200: ChapaWebhookResponseSerializer},
    )
)
class ChapaWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        signature = (
            request.headers.get("x-chapa-signature")
            or request.headers.get("chapa-signature")
        )
        service = ChapaPaymentService()
        if not service.verify_webhook_signature(request.body, signature):
            return Response({"received": True}, status=status.HTTP_200_OK)

        payload = request.data if isinstance(request.data, dict) else {}
        event_type = str(
            payload.get("event")
            or f"charge.{str(payload.get('status') or 'unknown').lower()}"
        )
        try:
            service.process_webhook_event(event_type, payload)
        except ChapaPaymentError:
            pass
        return Response({"received": True}, status=status.HTTP_200_OK)
