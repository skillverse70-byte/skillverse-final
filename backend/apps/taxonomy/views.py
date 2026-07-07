from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.response import Response

from apps.audit.services import record_audit_log
from apps.common.enums import TaxonomyDomain, TaxonomySuggestionStatus
from apps.common.permissions import IsAdminActor, IsRegularUserOrOrganizationActor
from apps.taxonomy.models import CategorySuggestion
from apps.taxonomy.serializers import (
    TaxonomyCatalogEntryCreateSerializer,
    TaxonomyCatalogEntrySerializer,
    TaxonomyCatalogEntryUpdateSerializer,
    TaxonomySuggestionCreateSerializer,
    TaxonomySuggestionDecisionSerializer,
    TaxonomySuggestionSerializer,
    serialize_catalog_entry,
)
from apps.taxonomy.services import (
    create_or_reactivate_catalog_entry,
    get_catalog_entry,
    list_catalog_entries,
    update_catalog_entry,
)


@extend_schema_view(
    get=extend_schema(
        tags=["taxonomy"],
        operation_id="taxonomy_catalog_list",
        responses={200: TaxonomyCatalogEntrySerializer(many=True)},
    )
)
class TaxonomyCatalogListView(ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TaxonomyCatalogEntrySerializer

    def list(self, request, *args, **kwargs):
        domain = request.query_params.get("domain") or None
        if domain and domain not in TaxonomyDomain.values:
            raise ValidationError({"domain": "Unsupported taxonomy domain."})
        entries = list_catalog_entries(domain=domain, active_only=True)
        serializer = self.get_serializer(entries, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["taxonomy"],
        operation_id="taxonomy_suggestions_mine_list",
        responses={200: TaxonomySuggestionSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["taxonomy"],
        operation_id="taxonomy_suggestions_create",
        request=TaxonomySuggestionCreateSerializer,
        responses={201: TaxonomySuggestionSerializer},
    ),
)
class TaxonomySuggestionListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRegularUserOrOrganizationActor]
    serializer_class = TaxonomySuggestionCreateSerializer

    def get(self, request):
        queryset = CategorySuggestion.objects.filter(suggested_by=request.user).select_related(
            "suggested_by",
            "organization",
            "reviewed_by",
        )
        serializer = TaxonomySuggestionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        suggestion = serializer.save()
        response_serializer = TaxonomySuggestionSerializer(suggestion)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        tags=["taxonomy", "admin"],
        operation_id="taxonomy_admin_catalog_list",
        responses={200: TaxonomyCatalogEntrySerializer(many=True)},
    ),
    post=extend_schema(
        tags=["taxonomy", "admin"],
        operation_id="taxonomy_admin_catalog_create",
        request=TaxonomyCatalogEntryCreateSerializer,
        responses={201: TaxonomyCatalogEntrySerializer},
    ),
)
class AdminTaxonomyCatalogListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = TaxonomyCatalogEntryCreateSerializer

    def get(self, request):
        domain = request.query_params.get("domain") or None
        if domain and domain not in TaxonomyDomain.values:
            raise ValidationError({"domain": "Unsupported taxonomy domain."})
        active_only = str(request.query_params.get("active_only", "")).strip().lower() in {
            "1",
            "true",
            "yes",
        }
        serializer = TaxonomyCatalogEntrySerializer(
            list_catalog_entries(domain=domain, active_only=active_only),
            many=True,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data or {},
            context={
                "request": request,
                "approved_at": timezone.now(),
            },
        )
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        record_audit_log(
            actor=request.user,
            action="taxonomy.catalog.created",
            target_type="taxonomy_catalog_entry",
            target_id=entry.id,
            summary=f"Admin created {request.data.get('domain')} catalog entry {entry.name}.",
            metadata={
                "domain": request.data.get("domain"),
                "name": entry.name,
                "is_active": entry.is_active,
            },
        )
        return Response(
            serialize_catalog_entry(entry, request.data.get("domain")),
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    patch=extend_schema(
        tags=["taxonomy", "admin"],
        operation_id="taxonomy_admin_catalog_update",
        request=TaxonomyCatalogEntryUpdateSerializer,
        responses={200: TaxonomyCatalogEntrySerializer},
    )
)
class AdminTaxonomyCatalogDetailView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = TaxonomyCatalogEntryUpdateSerializer

    def get_object(self, domain, pk):
        entry = get_catalog_entry(domain, pk)
        if entry is None:
            raise NotFound("Catalog entry was not found.")
        return entry

    def patch(self, request, domain, pk):
        if domain not in TaxonomyDomain.values:
            raise ValidationError({"domain": "Unsupported taxonomy domain."})
        entry = self.get_object(domain, pk)
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        entry = update_catalog_entry(domain=domain, entry=entry, **serializer.validated_data)
        record_audit_log(
            actor=request.user,
            action="taxonomy.catalog.updated",
            target_type="taxonomy_catalog_entry",
            target_id=entry.id,
            summary=f"Admin updated {domain} catalog entry {entry.name}.",
            metadata={
                "domain": domain,
                "is_active": entry.is_active,
            },
        )
        return Response(serialize_catalog_entry(entry, domain), status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["taxonomy", "admin"],
        operation_id="taxonomy_admin_suggestions_list",
        responses={200: TaxonomySuggestionSerializer(many=True)},
    )
)
class AdminTaxonomySuggestionListView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = TaxonomySuggestionSerializer

    def get_queryset(self):
        queryset = CategorySuggestion.objects.select_related(
            "suggested_by",
            "organization",
            "reviewed_by",
        )
        domain = self.request.query_params.get("domain")
        suggestion_status = self.request.query_params.get("status")
        if domain:
            queryset = queryset.filter(domain=domain)
        if suggestion_status:
            queryset = queryset.filter(status=suggestion_status)
        return queryset


@extend_schema_view(
    post=extend_schema(
        tags=["taxonomy", "admin"],
        operation_id="taxonomy_admin_suggestions_decision",
        request=TaxonomySuggestionDecisionSerializer,
        responses={200: TaxonomySuggestionSerializer},
    )
)
class AdminTaxonomySuggestionDecisionView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminActor]
    serializer_class = TaxonomySuggestionDecisionSerializer

    def get_object(self, pk):
        suggestion = CategorySuggestion.objects.select_related(
            "suggested_by",
            "organization",
            "reviewed_by",
        ).filter(pk=pk).first()
        if suggestion is None:
            raise NotFound("Suggestion was not found.")
        return suggestion

    @transaction.atomic
    def post(self, request, pk):
        suggestion = self.get_object(pk)
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        if suggestion.status != TaxonomySuggestionStatus.PENDING:
            raise ValidationError({"detail": "Only pending suggestions can be reviewed."})

        decision = serializer.validated_data["decision"]
        suggestion.status = decision
        suggestion.reviewer_notes = serializer.validated_data.get("reviewer_notes", "")
        suggestion.reviewed_by = request.user
        suggestion.reviewed_at = timezone.now()

        if decision == TaxonomySuggestionStatus.APPROVED:
            entry = create_or_reactivate_catalog_entry(
                domain=suggestion.domain,
                name=suggestion.name,
                description=suggestion.description,
                approved_by=request.user,
                approved_at=suggestion.reviewed_at,
            )
            suggestion.resolved_entry_name = entry.name
            suggestion.resolved_entry_slug = entry.slug
        else:
            suggestion.resolved_entry_name = ""
            suggestion.resolved_entry_slug = ""

        suggestion.save(
            update_fields=[
                "status",
                "reviewer_notes",
                "reviewed_by",
                "reviewed_at",
                "resolved_entry_name",
                "resolved_entry_slug",
                "updated_at",
            ]
        )

        record_audit_log(
            actor=request.user,
            action="taxonomy.suggestion.reviewed",
            target_type="taxonomy_suggestion",
            target_id=suggestion.id,
            summary=f"Admin {decision} taxonomy suggestion {suggestion.name}.",
            metadata={
                "domain": suggestion.domain,
                "decision": decision,
                "suggested_by_id": suggestion.suggested_by_id,
            },
        )

        response_serializer = TaxonomySuggestionSerializer(suggestion)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
