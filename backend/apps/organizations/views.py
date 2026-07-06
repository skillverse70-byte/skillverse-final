from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response

from apps.accounts.throttles import AuthEndpointThrottle
from apps.common.permissions import IsAdminActor, IsOrganizationActorOrAdmin
from apps.organizations.models import Organization, OrganizationVerificationRequest
from apps.organizations.serializers import (
    OrganizationVerificationDecisionSerializer,
    OrganizationVerificationOverviewSerializer,
    OrganizationVerificationRequestSerializer,
    OrganizationVerificationSubmitSerializer,
    OrganizationProfileSerializer,
    OrganizationProfileUpdateSerializer,
    OrganizationPublicProfileSerializer,
    OrganizationRegisterResponseSerializer,
    OrganizationRegisterSerializer,
)
from apps.organizations.services import review_organization_verification_request


@extend_schema(
    tags=["auth", "organizations"],
    request=OrganizationRegisterSerializer,
    responses={201: OrganizationRegisterResponseSerializer},
)
class OrganizationRegisterView(GenericAPIView):
    serializer_class = OrganizationRegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthEndpointThrottle]
    throttle_scope = "auth_organization_register"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()
        response_serializer = OrganizationRegisterResponseSerializer(
            {
                "detail": (
                    "Organization registration successful. Verify the primary email "
                    "address to continue."
                ),
                "email": organization.contact_email,
                "verification_required": True,
                "organization": organization,
            }
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["organizations"], responses={200: OrganizationProfileSerializer})
class CurrentOrganizationProfileView(RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActorOrAdmin]

    def get_object(self):
        return Organization.objects.select_related("owner").get(owner=self.request.user)

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return OrganizationProfileSerializer
        return OrganizationProfileUpdateSerializer

    def retrieve(self, request, *args, **kwargs):
        serializer = OrganizationProfileSerializer(self.get_object())
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        organization = self.get_object()
        serializer = self.get_serializer(organization, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response_serializer = OrganizationProfileSerializer(organization)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema(tags=["organizations"], responses={200: OrganizationPublicProfileSerializer})
class OrganizationPublicProfileView(RetrieveAPIView):
    queryset = Organization.objects.select_related("owner")
    serializer_class = OrganizationPublicProfileSerializer
    permission_classes = [permissions.AllowAny]


@extend_schema(tags=["organizations"], responses={200: OrganizationVerificationOverviewSerializer})
class CurrentOrganizationVerificationView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActorOrAdmin]

    def get(self, request):
        organization = Organization.objects.select_related("owner").get(owner=request.user)
        queryset = organization.verification_requests.select_related(
            "organization",
            "requested_by",
            "reviewed_by",
        )
        serializer = OrganizationVerificationOverviewSerializer(
            {
                "organization": organization,
                "latest_request": queryset.first(),
                "pending_request": queryset.filter(status="pending").first(),
                "history": queryset,
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=["organizations"],
    request=OrganizationVerificationSubmitSerializer,
    responses={201: OrganizationVerificationRequestSerializer},
)
class OrganizationVerificationSubmitView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActorOrAdmin]
    serializer_class = OrganizationVerificationSubmitSerializer

    def post(self, request):
        organization = Organization.objects.select_related("owner").get(owner=request.user)
        serializer = self.get_serializer(
            data=request.data,
            context={
                "request": request,
                "organization": organization,
            },
        )
        serializer.is_valid(raise_exception=True)
        verification_request = serializer.save()
        response_serializer = OrganizationVerificationRequestSerializer(verification_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["organizations"], responses={200: OrganizationVerificationRequestSerializer(many=True)})
class AdminOrganizationVerificationRequestListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = OrganizationVerificationRequestSerializer

    def get_queryset(self):
        queryset = OrganizationVerificationRequest.objects.select_related(
            "organization",
            "organization__owner",
            "requested_by",
            "reviewed_by",
        )
        status_filter = self.request.query_params.get("status", "").strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


@extend_schema(
    tags=["organizations"],
    request=OrganizationVerificationDecisionSerializer,
    responses={200: OrganizationVerificationRequestSerializer},
)
class AdminOrganizationVerificationDecisionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = OrganizationVerificationDecisionSerializer

    def get_object(self, pk):
        return OrganizationVerificationRequest.objects.select_related(
            "organization",
            "requested_by",
            "reviewed_by",
        ).get(pk=pk)

    def post(self, request, pk):
        verification_request = self.get_object(pk)
        serializer = self.get_serializer(
            data=request.data,
            context={"verification_request": verification_request},
        )
        serializer.is_valid(raise_exception=True)
        reviewed_request = review_organization_verification_request(
            verification_request=verification_request,
            reviewer=request.user,
            decision=serializer.validated_data["decision"],
            reviewer_notes=serializer.validated_data.get("reviewer_notes", ""),
            use_admin_override=serializer.validated_data.get("use_admin_override", False),
        )
        response_serializer = OrganizationVerificationRequestSerializer(reviewed_request)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
