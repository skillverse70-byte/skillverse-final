from django.contrib.auth import get_user_model
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from apps.certificates.models import Certificate, ServiceCreditRecord
from apps.certificates.serializers import (
    AdminTrustOverviewSerializer,
    CertificateIssueSerializer,
    CertificatePortfolioSerializer,
    CertificateSerializer,
    OrganizationTrustOverviewSerializer,
    ServiceCreditRecordSerializer,
    ServiceCreditIssueSerializer,
    TrustRevokeSerializer,
    annotate_certificate_queryset,
    annotate_service_credit_queryset,
)
from apps.common.enums import CertificateSourceType, CertificateStatus, Role, ServiceCreditStatus
from apps.common.permissions import IsAdminActor, IsOrganizationActor
from apps.communities.serializers import annotate_community_queryset
from apps.communities.models import CommunityGroup
from apps.courses.models import Enrollment
from apps.courses.serializers import CourseProgramSummarySerializer
from apps.events.models import EventRSVP
from apps.events.serializers import EventSummarySerializer
from apps.notifications.services import (
    notify_certificate_issued,
    notify_certificate_revoked,
    notify_service_credit_issued,
    notify_service_credit_revoked,
)

User = get_user_model()


def _actor_summary(user):
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
    }


@extend_schema_view(
    get=extend_schema(
        tags=["certificates"],
        operation_id="certificate_portfolio",
        responses={200: CertificatePortfolioSerializer},
    )
)
class CertificatePortfolioView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        certificates = annotate_certificate_queryset(
            Certificate.objects.filter(user=request.user, status="active")
        )
        service_credits = annotate_service_credit_queryset(
            ServiceCreditRecord.objects.filter(user=request.user, status="issued")
        )
        serializer = CertificatePortfolioSerializer(
            {
                "certificates": certificates,
                "service_credits": service_credits,
            },
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["certificates"],
        operation_id="certificate_lookup_detail",
        responses={200: CertificateSerializer},
    )
)
class CertificateDetailView(GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, certificate_id):
        certificate = annotate_certificate_queryset(
            Certificate.objects.filter(certificate_id=certificate_id)
        ).first()
        if certificate is None:
            raise NotFound("Certificate not found.")
        serializer = CertificateSerializer(certificate, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["certificates", "organizations"],
        operation_id="organization_trust_overview",
        responses={200: OrganizationTrustOverviewSerializer},
    )
)
class OrganizationTrustOverviewView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]

    def get(self, request):
        organization = getattr(request.user, "organization_profile", None)
        if organization is None:
            raise PermissionDenied("Organization profile is required.")

        communities = annotate_community_queryset(
            CommunityGroup.objects.filter(organization=organization, is_active=True)
        ).order_by("-created_at", "-id")
        service_credits = annotate_service_credit_queryset(
            ServiceCreditRecord.objects.filter(organization=organization)
        )
        certificates = annotate_certificate_queryset(
            Certificate.objects.filter(organization=organization)
        )

        course_completion_records = []
        for enrollment in (
            Enrollment.objects.filter(
                course_program__organization=organization,
                status="completed",
            )
            .select_related("user", "course_program", "course_program__organization")
            .order_by("-completed_at", "-id")[:20]
        ):
            already_issued = certificates.filter(
                user=enrollment.user,
                course_program=enrollment.course_program,
                source_type=CertificateSourceType.COURSE_COMPLETION,
            ).exists()
            course_completion_records.append(
                {
                    "user": _actor_summary(enrollment.user),
                    "course": enrollment.course_program,
                    "event": None,
                    "service_credit": None,
                    "source_type": CertificateSourceType.COURSE_COMPLETION,
                    "certificate_already_issued": already_issued,
                }
            )

        event_attendance_records = []
        for attendee in (
            EventRSVP.objects.filter(
                event__organization=organization,
                attended_at__isnull=False,
            )
            .select_related("user", "event", "event__organization")
            .order_by("-attended_at", "-id")[:20]
        ):
            already_issued = certificates.filter(
                user=attendee.user,
                event=attendee.event,
                source_type=CertificateSourceType.EVENT_PARTICIPATION,
            ).exists()
            event_attendance_records.append(
                {
                    "user": _actor_summary(attendee.user),
                    "course": None,
                    "event": attendee.event,
                    "service_credit": None,
                    "source_type": CertificateSourceType.EVENT_PARTICIPATION,
                    "certificate_already_issued": already_issued,
                }
            )

        service_credit_records = []
        for record in service_credits[:20]:
            already_issued = certificates.filter(
                service_credit=record,
                source_type=CertificateSourceType.SERVICE_CREDIT,
            ).exists()
            service_credit_records.append(
                {
                    "user": _actor_summary(record.user),
                    "course": None,
                    "event": None,
                    "service_credit": record,
                    "source_type": CertificateSourceType.SERVICE_CREDIT,
                    "certificate_already_issued": already_issued,
                }
            )

        serializer = OrganizationTrustOverviewSerializer(
            {
                "communities": communities,
                "service_credits": service_credits[:20],
                "certificates": certificates[:20],
                "eligible_course_completions": course_completion_records,
                "eligible_event_attendances": event_attendance_records,
                "eligible_service_credit_certificates": service_credit_records,
            },
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["certificates", "organizations"],
        operation_id="organization_issue_service_credit",
        request=ServiceCreditIssueSerializer,
        responses={201: ServiceCreditRecordSerializer},
    )
)
class OrganizationServiceCreditIssueView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    serializer_class = ServiceCreditIssueSerializer

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request, "user_model": User},
        )
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        notify_service_credit_issued(record)
        response_serializer = ServiceCreditRecordSerializer(record, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    post=extend_schema(
        tags=["certificates", "organizations"],
        operation_id="organization_issue_certificate",
        request=CertificateIssueSerializer,
        responses={201: CertificateSerializer},
    )
)
class OrganizationCertificateIssueView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    serializer_class = CertificateIssueSerializer

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request, "user_model": User},
        )
        serializer.is_valid(raise_exception=True)
        certificate = serializer.save()
        notify_certificate_issued(certificate)
        response_serializer = CertificateSerializer(certificate, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class BaseTrustRevokeView(GenericAPIView):
    serializer_class = TrustRevokeSerializer
    target_model = None
    target_status_field = ""
    target_status_value = ""
    response_serializer_class = None
    is_organization_scoped = False

    def get_target_queryset(self, request):
        queryset = self.target_model.objects.all()
        if self.is_organization_scoped:
            organization = getattr(request.user, "organization_profile", None)
            if organization is None:
                raise PermissionDenied("Organization profile is required.")
            queryset = queryset.filter(organization=organization)
        return queryset

    def perform_revoke(self, target, *, reason):
        if getattr(target, self.target_status_field) == self.target_status_value:
            raise PermissionDenied("This record is already revoked.")
        setattr(target, self.target_status_field, self.target_status_value)
        update_fields = [self.target_status_field, "updated_at"]
        if hasattr(target, "revoked_at"):
            target.revoked_at = timezone.now()
            update_fields.append("revoked_at")
        target.save(update_fields=update_fields)
        self.notify(target, reason=reason)
        return target

    def notify(self, target, *, reason):
        return None

    def post(self, request, pk):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target = self.get_target_queryset(request).filter(pk=pk).first()
        if target is None:
            raise NotFound("Record not found.")
        target = self.perform_revoke(target, reason=serializer.validated_data.get("reason", "").strip())
        response_serializer = self.response_serializer_class(target, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["certificates", "organizations"],
        operation_id="organization_revoke_service_credit",
        request=TrustRevokeSerializer,
        responses={200: ServiceCreditRecordSerializer},
    )
)
class OrganizationServiceCreditRevokeView(BaseTrustRevokeView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    target_model = ServiceCreditRecord
    target_status_field = "status"
    target_status_value = ServiceCreditStatus.REVOKED
    response_serializer_class = ServiceCreditRecordSerializer
    is_organization_scoped = True

    def notify(self, target, *, reason):
        notify_service_credit_revoked(target, reason=reason)


@extend_schema_view(
    post=extend_schema(
        tags=["certificates", "organizations"],
        operation_id="organization_revoke_certificate",
        request=TrustRevokeSerializer,
        responses={200: CertificateSerializer},
    )
)
class OrganizationCertificateRevokeView(BaseTrustRevokeView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    target_model = Certificate
    target_status_field = "status"
    target_status_value = CertificateStatus.REVOKED
    response_serializer_class = CertificateSerializer
    is_organization_scoped = True

    def notify(self, target, *, reason):
        notify_certificate_revoked(target, reason=reason)


@extend_schema_view(
    get=extend_schema(
        tags=["certificates", "admin"],
        operation_id="admin_trust_overview",
        responses={200: AdminTrustOverviewSerializer},
    )
)
class AdminTrustOverviewView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]

    def get(self, request):
        serializer = AdminTrustOverviewSerializer(
            {
                "communities": annotate_community_queryset(CommunityGroup.objects.all()).order_by("-created_at", "-id")[:25],
                "service_credits": annotate_service_credit_queryset(ServiceCreditRecord.objects.all())[:25],
                "certificates": annotate_certificate_queryset(Certificate.objects.all())[:25],
            },
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        tags=["certificates", "admin"],
        operation_id="admin_revoke_service_credit",
        request=TrustRevokeSerializer,
        responses={200: ServiceCreditRecordSerializer},
    )
)
class AdminServiceCreditRevokeView(BaseTrustRevokeView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    target_model = ServiceCreditRecord
    target_status_field = "status"
    target_status_value = ServiceCreditStatus.REVOKED
    response_serializer_class = ServiceCreditRecordSerializer

    def notify(self, target, *, reason):
        notify_service_credit_revoked(target, reason=reason)


@extend_schema_view(
    post=extend_schema(
        tags=["certificates", "admin"],
        operation_id="admin_revoke_certificate",
        request=TrustRevokeSerializer,
        responses={200: CertificateSerializer},
    )
)
class AdminCertificateRevokeView(BaseTrustRevokeView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    target_model = Certificate
    target_status_field = "status"
    target_status_value = CertificateStatus.REVOKED
    response_serializer_class = CertificateSerializer

    def notify(self, target, *, reason):
        notify_certificate_revoked(target, reason=reason)
