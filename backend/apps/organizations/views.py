from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from apps.accounts.throttles import AuthEndpointThrottle
from apps.organizations.serializers import (
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
