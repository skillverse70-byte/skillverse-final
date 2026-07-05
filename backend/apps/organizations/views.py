from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView, RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response

from apps.accounts.throttles import AuthEndpointThrottle
from apps.common.permissions import IsOrganizationActorOrAdmin
from apps.organizations.models import Organization
from apps.organizations.serializers import (
    OrganizationProfileSerializer,
    OrganizationProfileUpdateSerializer,
    OrganizationPublicProfileSerializer,
    OrganizationRegisterResponseSerializer,
    OrganizationRegisterSerializer,
    OrganizationSummarySerializer,
)


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
