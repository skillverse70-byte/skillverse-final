from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions
from rest_framework.generics import ListAPIView, RetrieveAPIView

from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer, AdminAuditLogFilterSerializer
from apps.common.permissions import IsAdminActor


@extend_schema_view(
    get=extend_schema(
        tags=["audit", "admin"],
        operation_id="admin_audit_log_list",
        parameters=[AdminAuditLogFilterSerializer],
        responses={200: AuditLogSerializer(many=True)},
    )
)
class AdminAuditLogListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AuditLogSerializer

    def _validated_filters(self):
        if not hasattr(self, "_audit_filter_values"):
            serializer = AdminAuditLogFilterSerializer(data=self.request.query_params)
            serializer.is_valid(raise_exception=True)
            self._audit_filter_values = serializer.validated_data
        return self._audit_filter_values

    def get_queryset(self):
        filters = self._validated_filters()
        queryset = AuditLog.objects.select_related("actor")

        action = filters.get("action")
        if action:
            queryset = queryset.filter(action=action)

        target_type = filters.get("target_type")
        if target_type:
            queryset = queryset.filter(target_type=target_type)

        target_id = filters.get("target_id")
        if target_id:
            queryset = queryset.filter(target_id=target_id)

        actor_id = filters.get("actor_id")
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)

        created_after = filters.get("created_after")
        if created_after:
            queryset = queryset.filter(created_at__gte=created_after)

        created_before = filters.get("created_before")
        if created_before:
            queryset = queryset.filter(created_at__lte=created_before)

        search = filters.get("search")
        if search:
            queryset = queryset.filter(
                Q(summary__icontains=search)
                | Q(action__icontains=search)
                | Q(target_type__icontains=search)
                | Q(actor__email__icontains=search)
                | Q(actor__full_name__icontains=search)
            )

        return queryset


@extend_schema_view(
    get=extend_schema(
        tags=["audit", "admin"],
        operation_id="admin_audit_log_detail",
        responses={200: AuditLogSerializer},
    )
)
class AdminAuditLogDetailView(RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.select_related("actor")
