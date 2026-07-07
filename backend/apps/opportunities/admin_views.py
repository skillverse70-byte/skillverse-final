from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.response import Response

from apps.audit.services import record_audit_log
from apps.common.permissions import IsAdminActor
from apps.opportunities.admin_serializers import (
    AdminOpportunityModerationDecisionSerializer,
    AdminOpportunityModerationSerializer,
)
from apps.opportunities.models import Opportunity
from apps.opportunities.serializers import annotate_opportunity_queryset


@extend_schema_view(
    get=extend_schema(
        tags=["opportunities", "admin"],
        operation_id="admin_jobs_list",
        responses={200: AdminOpportunityModerationSerializer(many=True)},
    )
)
class AdminOpportunityModerationListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AdminOpportunityModerationSerializer

    def get_queryset(self):
        queryset = annotate_opportunity_queryset(
            Opportunity.objects.select_related(
                "organization",
                "organization__owner",
                "admin_reviewed_by",
            )
        ).order_by("-updated_at", "-id")
        status_value = self.request.query_params.get("status")
        organization_id = self.request.query_params.get("organization_id")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
        return queryset


@extend_schema_view(
    post=extend_schema(
        tags=["opportunities", "admin"],
        operation_id="admin_jobs_decision",
        request=AdminOpportunityModerationDecisionSerializer,
        responses={200: AdminOpportunityModerationSerializer},
    )
)
class AdminOpportunityModerationDecisionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = AdminOpportunityModerationDecisionSerializer

    def get_object(self, pk):
        opportunity = annotate_opportunity_queryset(
            Opportunity.objects.select_related(
                "organization",
                "organization__owner",
                "admin_reviewed_by",
            )
        ).filter(pk=pk).first()
        if opportunity is None:
            raise NotFound("Opportunity was not found.")
        return opportunity

    def post(self, request, pk):
        opportunity = self.get_object(pk)
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        changed_fields = ["admin_reviewed_by", "admin_reviewed_at", "updated_at"]
        if "status" in serializer.validated_data:
            opportunity.status = serializer.validated_data["status"]
            changed_fields.append("status")
        if "review_notes" in serializer.validated_data:
            opportunity.admin_review_notes = serializer.validated_data.get("review_notes", "")
            changed_fields.append("admin_review_notes")
        opportunity.admin_reviewed_by = request.user
        opportunity.admin_reviewed_at = timezone.now()
        opportunity.save(update_fields=changed_fields)

        record_audit_log(
            actor=request.user,
            action="opportunity.admin.reviewed",
            target_type="opportunity",
            target_id=opportunity.id,
            summary=f"Admin reviewed opportunity {opportunity.title}.",
            metadata={
                "status": opportunity.status,
                "review_notes": opportunity.admin_review_notes,
            },
        )

        return Response(AdminOpportunityModerationSerializer(opportunity).data, status=status.HTTP_200_OK)
