from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import GenericAPIView, ListAPIView, RetrieveAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response

from apps.common.enums import JobApplicationStatus, OpportunityStatus, Role
from apps.common.permissions import IsOrganizationActor, IsRegularUser, normalize_actor_role
from apps.opportunities.models import JobApplication, Opportunity
from apps.opportunities.serializers import (
    ApplicantStatusUpdateSerializer,
    ApplicantSummarySerializer,
    JobApplicationCreateSerializer,
    JobApplicationSummarySerializer,
    OpportunityDetailSerializer,
    OpportunitySummarySerializer,
    OpportunityWriteSerializer,
    annotate_opportunity_queryset,
)
from apps.organizations.models import Organization


def public_opportunity_queryset():
    return annotate_opportunity_queryset(
        Opportunity.objects.filter(status__in=[OpportunityStatus.OPEN, OpportunityStatus.FILLED])
    )


def organization_opportunity_queryset(user):
    return annotate_opportunity_queryset(
        Opportunity.objects.filter(organization__owner=user)
    )


def with_viewer_application(opportunity, user):
    if getattr(user, "is_authenticated", False):
        opportunity._viewer_application = JobApplication.objects.filter(
            opportunity=opportunity,
            user=user,
        ).first()
    return opportunity


def regular_user_application_queryset(user):
    return (
        JobApplication.objects.filter(user=user)
        .select_related("opportunity", "opportunity__organization")
        .order_by("-updated_at", "-id")
    )


def organization_application_queryset(user):
    return (
        JobApplication.objects.filter(opportunity__organization__owner=user)
        .select_related("user", "opportunity", "opportunity__organization")
        .order_by("-updated_at", "-id")
    )


@extend_schema_view(
    get=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_public_list",
        responses={200: OpportunitySummarySerializer(many=True)},
    )
)
class OpportunityListView(ListAPIView):
    serializer_class = OpportunitySummarySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = public_opportunity_queryset()
        type_value = self.request.query_params.get("type")
        category = self.request.query_params.get("category")
        status_value = self.request.query_params.get("status")

        if type_value:
            queryset = queryset.filter(type=type_value)
        if category:
            queryset = queryset.filter(category__iexact=category)
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset


@extend_schema_view(
    get=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_public_retrieve",
        responses={200: OpportunityDetailSerializer},
    )
)
class OpportunityDetailView(RetrieveAPIView):
    serializer_class = OpportunityDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return annotate_opportunity_queryset(
            Opportunity.objects.exclude(status=OpportunityStatus.DRAFT)
        )

    def retrieve(self, request, *args, **kwargs):
        instance = with_viewer_application(self.get_object(), request.user)
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_manage_list",
        responses={200: OpportunityDetailSerializer(many=True)},
    ),
    post=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_manage_create",
        request=OpportunityWriteSerializer,
        responses={201: OpportunityDetailSerializer},
    ),
)
class OrganizationOpportunityListCreateView(GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]
    serializer_class = OpportunityWriteSerializer

    def get_organization(self):
        return Organization.objects.get(owner=self.request.user)

    def serialize_opportunity(self, instance, many=False):
        return OpportunityDetailSerializer(
            instance,
            many=many,
            context={"request": self.request},
        )

    def get(self, request):
        queryset = organization_opportunity_queryset(request.user)
        serializer = self.serialize_opportunity(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data,
            context={"organization": self.get_organization()},
        )
        serializer.is_valid(raise_exception=True)
        opportunity = serializer.save()
        response_serializer = self.serialize_opportunity(opportunity)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_manage_retrieve",
        responses={200: OpportunityDetailSerializer},
    ),
    patch=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_manage_update",
        request=OpportunityWriteSerializer,
        responses={200: OpportunityDetailSerializer},
    ),
    put=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_manage_replace",
        request=OpportunityWriteSerializer,
        responses={200: OpportunityDetailSerializer},
    ),
    delete=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_manage_delete",
        responses={204: None},
    ),
)
class OrganizationOpportunityDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]

    def get_queryset(self):
        return organization_opportunity_queryset(self.request.user)

    def get_serializer_class(self):
        if self.request.method in permissions.SAFE_METHODS:
            return OpportunityDetailSerializer
        return OpportunityWriteSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["organization"] = Organization.objects.get(owner=self.request.user)
        return context

    def retrieve(self, request, *args, **kwargs):
        serializer = OpportunityDetailSerializer(
            self.get_object(),
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        opportunity = serializer.save()
        response_serializer = OpportunityDetailSerializer(
            opportunity,
            context={"request": request},
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema_view(
    get=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_applications_mine_list",
        responses={200: JobApplicationSummarySerializer(many=True)},
    )
)
class RegularUserApplicationListView(ListAPIView):
    serializer_class = JobApplicationSummarySerializer
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def get_queryset(self):
        return regular_user_application_queryset(self.request.user)


@extend_schema_view(
    post=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_apply_create",
        request=JobApplicationCreateSerializer,
        responses={201: JobApplicationSummarySerializer},
    )
)
class RegularUserApplicationCreateView(GenericAPIView):
    serializer_class = JobApplicationCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsRegularUser]

    def get_opportunity(self):
        opportunity = (
            Opportunity.objects.select_related("organization", "organization__owner")
            .filter(pk=self.kwargs["pk"])
            .first()
        )
        if opportunity is None or opportunity.status == OpportunityStatus.DRAFT:
            raise NotFound("Opportunity was not found.")
        return opportunity

    @transaction.atomic
    def post(self, request, pk):
        opportunity = self.get_opportunity()
        if opportunity.status != OpportunityStatus.OPEN:
            raise ValidationError({"detail": "This opportunity is not accepting applications."})
        if opportunity.deadline and opportunity.deadline < timezone.localdate():
            raise ValidationError({"detail": "The application deadline has passed."})
        if opportunity.organization.owner_id == request.user.id:
            raise ValidationError({"detail": "You cannot apply to your own opportunity."})

        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        application, created = JobApplication.objects.get_or_create(
            user=request.user,
            opportunity=opportunity,
            defaults={
                "cover_letter": serializer.validated_data.get("cover_letter", ""),
                "status": JobApplicationStatus.APPLIED,
            },
        )
        if not created:
            raise ValidationError({"detail": "You have already applied to this opportunity."})

        from apps.notifications.services import notify_job_application_created

        transaction.on_commit(lambda: notify_job_application_created(application))
        response_serializer = JobApplicationSummarySerializer(application)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    get=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_manage_applications_list",
        responses={200: ApplicantSummarySerializer(many=True)},
    )
)
class OrganizationApplicationListView(ListAPIView):
    serializer_class = ApplicantSummarySerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]

    def get_queryset(self):
        queryset = organization_application_queryset(self.request.user)
        opportunity_id = self.request.query_params.get("opportunity_id")
        status_value = self.request.query_params.get("status")
        if opportunity_id:
            queryset = queryset.filter(opportunity_id=opportunity_id)
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset


@extend_schema_view(
    patch=extend_schema(
        tags=["opportunities"],
        operation_id="jobs_manage_applications_update",
        request=ApplicantStatusUpdateSerializer,
        responses={200: ApplicantSummarySerializer},
    )
)
class OrganizationApplicationDetailView(GenericAPIView):
    serializer_class = ApplicantStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationActor]

    def get_object(self):
        application = organization_application_queryset(self.request.user).filter(
            pk=self.kwargs["pk"]
        ).first()
        if application is None:
            raise NotFound("Application was not found.")
        return application

    @transaction.atomic
    def patch(self, request, pk):
        application = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        application.status = serializer.validated_data["status"]
        application.reviewer_notes = serializer.validated_data.get("reviewer_notes", "")
        application.reviewed_at = timezone.now()
        application.save(update_fields=["status", "reviewer_notes", "reviewed_at", "updated_at"])

        from apps.notifications.services import notify_job_application_updated

        transaction.on_commit(lambda: notify_job_application_updated(application))
        response_serializer = ApplicantSummarySerializer(application)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
