from django.contrib.auth import get_user_model
from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.response import Response

from apps.accounts.admin_serializers import (
    AdminUserModerationDecisionSerializer,
    AdminUserModerationSerializer,
)
from apps.audit.services import record_audit_log
from apps.common.permissions import IsAdminActor

User = get_user_model()


@extend_schema_view(
    get=extend_schema(
        tags=["auth", "admin"],
        operation_id="admin_users_list",
        responses={200: AdminUserModerationSerializer(many=True)},
    )
)
class AdminUserModerationListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AdminUserModerationSerializer

    def get_queryset(self):
        queryset = User.objects.all().order_by("-date_joined", "-id")
        role = self.request.query_params.get("role")
        is_active = self.request.query_params.get("is_active")
        if role:
            queryset = queryset.filter(role=role)
        if is_active is not None and is_active != "":
            normalized = str(is_active).strip().lower()
            queryset = queryset.filter(is_active=normalized in {"1", "true", "yes"})
        return queryset


@extend_schema_view(
    post=extend_schema(
        tags=["auth", "admin"],
        operation_id="admin_users_decision",
        request=AdminUserModerationDecisionSerializer,
        responses={200: AdminUserModerationSerializer},
    )
)
class AdminUserModerationDecisionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AdminUserModerationDecisionSerializer

    def get_object(self, pk):
        user = User.objects.filter(pk=pk).first()
        if user is None:
            raise NotFound("User was not found.")
        return user

    @transaction.atomic
    def post(self, request, pk):
        user = self.get_object(pk)
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        if user.id == request.user.id and serializer.validated_data["is_active"] is False:
            raise ValidationError({"is_active": "You cannot deactivate your own admin account."})

        user.is_active = serializer.validated_data["is_active"]
        user.save(update_fields=["is_active"])

        record_audit_log(
            actor=request.user,
            action="account.admin.moderated",
            target_type="user",
            target_id=user.id,
            summary=f"Admin updated active status for {user.email}.",
            metadata={
                "is_active": user.is_active,
                "reason": serializer.validated_data.get("reason", ""),
                "role": user.role,
            },
        )

        return Response(AdminUserModerationSerializer(user).data, status=status.HTTP_200_OK)
