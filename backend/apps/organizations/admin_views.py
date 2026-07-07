from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.response import Response

from apps.audit.services import record_audit_log
from apps.common.permissions import IsAdminActor
from apps.organizations.admin_serializers import (
    AdminOrganizationModerationDecisionSerializer,
    AdminOrganizationModerationSerializer,
)
from apps.organizations.models import Organization


@extend_schema_view(
    get=extend_schema(
        tags=["organizations", "admin"],
        operation_id="admin_organizations_list",
        responses={200: AdminOrganizationModerationSerializer(many=True)},
    )
)
class AdminOrganizationModerationListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AdminOrganizationModerationSerializer

    def get_queryset(self):
        queryset = Organization.objects.select_related("owner", "moderated_by").order_by("name", "id")
        verification_status = self.request.query_params.get("verification_status")
        is_suspended = self.request.query_params.get("is_suspended")
        if verification_status:
            queryset = queryset.filter(verification_status=verification_status)
        if is_suspended is not None and is_suspended != "":
            normalized = str(is_suspended).strip().lower()
            queryset = queryset.filter(is_suspended=normalized in {"1", "true", "yes"})
        return queryset


@extend_schema_view(
    post=extend_schema(
        tags=["organizations", "admin"],
        operation_id="admin_organizations_decision",
        request=AdminOrganizationModerationDecisionSerializer,
        responses={200: AdminOrganizationModerationSerializer},
    )
)
class AdminOrganizationModerationDecisionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AdminOrganizationModerationDecisionSerializer

    def get_object(self, pk):
        organization = Organization.objects.select_related("owner", "moderated_by").filter(pk=pk).first()
        if organization is None:
            raise NotFound("Organization was not found.")
        return organization

    @transaction.atomic
    def post(self, request, pk):
        organization = self.get_object(pk)
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        organization.is_suspended = serializer.validated_data["is_suspended"]
        organization.suspension_reason = serializer.validated_data.get("suspension_reason", "")
        organization.moderated_by = request.user
        organization.moderated_at = timezone.now()
        organization.save(
            update_fields=[
                "is_suspended",
                "suspension_reason",
                "moderated_by",
                "moderated_at",
                "updated_at",
            ]
        )

        record_audit_log(
            actor=request.user,
            action="organization.admin.moderated",
            target_type="organization",
            target_id=organization.id,
            summary=f"Admin updated moderation state for {organization.name}.",
            metadata={
                "is_suspended": organization.is_suspended,
                "suspension_reason": organization.suspension_reason,
            },
        )

        return Response(AdminOrganizationModerationSerializer(organization).data, status=status.HTTP_200_OK)
